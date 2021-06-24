package db

import (
	"errors"
	"io/fs"
	"io/ioutil"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"sync"

	"github.com/davecgh/go-spew/spew"
	"github.com/gofrs/flock"
	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
	"m0rg.dev/x10/spec"
)

type PackageDatabaseContents struct {
	Packages      map[string]spec.SpecDbData // FQN -> data
	ProviderIndex map[string]string          // atom -> FQN
}

type PackageDatabase struct {
	BackingFile string
}

func (db *PackageDatabase) unlocked_Read() (*PackageDatabaseContents, error) {
	raw_contents, err := ioutil.ReadFile(db.BackingFile)
	if err != nil {
		if os.IsNotExist(err) {
			return &PackageDatabaseContents{
				Packages:      map[string]spec.SpecDbData{},
				ProviderIndex: map[string]string{},
			}, nil
		}
		return nil, err
	}

	contents := &PackageDatabaseContents{}
	err = yaml.UnmarshalStrict(raw_contents, contents)
	if err != nil {
		return nil, err
	}

	if contents.Packages == nil {
		contents.Packages = map[string]spec.SpecDbData{}
	}

	if contents.ProviderIndex == nil {
		contents.ProviderIndex = map[string]string{}
	}

	return contents, nil
}

func (db *PackageDatabase) Read() (*PackageDatabaseContents, error) {
	lock := flock.New(db.BackingFile + ".lock")
	lock.RLock()
	defer lock.Close()

	contents, err := db.unlocked_Read()
	return contents, err
}

func (db *PackageDatabase) unlocked_Write(contents *PackageDatabaseContents) error {
	d, err := yaml.Marshal(contents)
	if err != nil {
		return err
	}

	return ioutil.WriteFile(db.BackingFile, d, os.ModePerm)
}

func (db *PackageDatabase) Update(pkg spec.SpecLayer) error {
	// Attempt to grab generated dependencies
	dbpkg := pkg.ToDB()
	dbpkg.GeneratedValid = true
	gen_depends, err := ioutil.ReadFile(filepath.Join("targetdir", "destdir", pkg.GetFQN(), "generated-depends"))
	if err == nil {
		dbpkg.GeneratedDepends = strings.Split(strings.TrimSpace(string(gen_depends)), "\n")
	} else {
		if !os.IsNotExist(err) {
			dbpkg.GeneratedValid = false
		}
	}
	gen_provides, err := ioutil.ReadFile(filepath.Join("targetdir", "destdir", pkg.GetFQN(), "generated-provides"))
	if err == nil {
		dbpkg.GeneratedProvides = strings.Split(strings.TrimSpace(string(gen_provides)), "\n")
	} else {
		if !os.IsNotExist(err) {
			dbpkg.GeneratedValid = false
		}
	}

	lock := flock.New(db.BackingFile + ".lock")
	lock.Lock()
	defer lock.Close()

	contents, err := db.unlocked_Read()
	if err != nil {
		return err
	}

	contents.Packages[pkg.GetFQN()] = dbpkg
	if dbpkg.GeneratedValid {
		for _, prov := range dbpkg.GeneratedProvides {
			contents.ProviderIndex[prov] = pkg.GetFQN()
		}
	}

	// TODO only do this if package is latest
	contents.ProviderIndex[pkg.Meta.Name] = pkg.GetFQN()

	db.unlocked_Write(contents)

	logrus.Info("Updated package database.")
	return err
}

func (contents *PackageDatabaseContents) CheckUpToDate(from_repo spec.SpecLayer) bool {
	repo_to_db := from_repo.ToDB()
	from_db, ok := contents.Packages[from_repo.GetFQN()]
	if ok {
		logrus.Debugf(" => already in DB")
		if reflect.DeepEqual(repo_to_db.Meta, from_db.Meta) {
			logrus.Debugf("  => meta match")
		} else {
			logrus.Warnf(" => meta for %s doesn't match repo,", from_repo.GetFQN())
			logrus.Debug(spew.Sdump(repo_to_db))
			logrus.Debug(spew.Sdump(from_db))
			return false
		}
	} else {
		return false
	}
	return true
}

func (db *PackageDatabase) IndexFromRepo() error {
	lock := flock.New(db.BackingFile + ".lock")
	lock.Lock()
	defer lock.Close()

	contents, err := db.unlocked_Read()
	if err != nil {
		return err
	}

	var wg sync.WaitGroup

	filepath.WalkDir("pkgs", func(path string, d fs.DirEntry, err error) error {
		if d.Name() == "layers" {
			return fs.SkipDir
		}
		if d.Type().IsRegular() {
			wg.Add(1)
			go func() {
				logrus.Infof("Indexing: %s", path)

				from_repo := spec.LoadPackage(path)
				if !contents.CheckUpToDate(from_repo) {
					repo_to_db := from_repo.ToDB()
					logrus.Info(" => updating database")
					contents.Packages[from_repo.GetFQN()] = repo_to_db
				}
				wg.Done()
			}()
		}

		return nil
	})

	wg.Wait()

	logrus.Infof("Rebuilding provider cache")
	contents.ProviderIndex = map[string]string{}
	for fqn, dbpkg := range contents.Packages {
		if dbpkg.GeneratedValid {
			for _, prov := range dbpkg.GeneratedProvides {
				contents.ProviderIndex[prov] = fqn
			}
		}
		// TODO only do this if package is latest
		contents.ProviderIndex[dbpkg.Meta.Name] = fqn
	}

	db.unlocked_Write(contents)
	logrus.Info("Updated package database.")
	return nil
}

type DependencyType int

const (
	DepHostBuild DependencyType = iota
	DepBuild
	DepTest
	DepRun
)

func (contents *PackageDatabaseContents) FindFQN(atom string) (*string, error) {
	_, is_fqn := contents.Packages[atom]
	if is_fqn {
		return &atom, nil
	}
	fqn, have_provider := contents.ProviderIndex[atom]
	if have_provider {
		return &fqn, nil
	}
	return nil, errors.New("Can't find FQN for " + atom)
}

func (db *PackageDatabase) GetInstallDeps(top_level string, dep_type DependencyType) (pkgs []spec.SpecDbData, complete bool, err error) {
	contents, err := db.Read()
	if err != nil {
		return nil, false, err
	}
	outstanding := map[string]bool{}
	resolved := map[string]string{}
	complete = true

	pkg_fqn, err := contents.FindFQN(top_level)
	if err != nil {
		return nil, false, err
	}
	pkg := contents.Packages[*pkg_fqn]

	switch dep_type {
	case DepRun:
		outstanding[top_level] = false
	case DepTest:
		for _, atom := range pkg.Depends.Test {
			outstanding[atom] = false
		}
	case DepBuild:
		for _, atom := range pkg.Depends.Build {
			outstanding[atom] = false
		}
	case DepHostBuild:
		for _, atom := range pkg.Depends.HostBuild {
			outstanding[atom] = false
		}
	}

	for len(outstanding) > 0 {
		for depend := range outstanding {
			logrus.Debugf("Evaluating: %s", depend)
			fqn, have_provider := contents.ProviderIndex[depend]
			if have_provider {
				depend_pkg := contents.Packages[fqn]

				for _, sub_depend := range depend_pkg.Depends.Run {
					_, already_resolved := resolved[sub_depend]
					if !already_resolved {
						outstanding[sub_depend] = false
					}
				}

				if _, no_gen := os.LookupEnv("X10_NO_GENERATED_DEPS"); !no_gen {
					if !depend_pkg.GeneratedValid {
						logrus.Warnf("Need to evaluate %s but no generated depends", fqn)
						complete = false
					}
					for _, sub_depend := range depend_pkg.GeneratedDepends {
						_, already_resolved := resolved[sub_depend]
						if !already_resolved {
							outstanding[sub_depend] = false
						}
					}
				}
				resolved[depend] = fqn
				delete(outstanding, depend)
				logrus.Debugf(" => provided by %s", fqn)
			} else {
				logrus.Fatalf("Can't find dependency %s for %s", depend, top_level)
			}
		}
	}

	uniquefqns := map[string]bool{}
	for _, v := range resolved {
		uniquefqns[v] = true
	}

	for k := range uniquefqns {
		pkgs = append(pkgs, contents.Packages[k])
	}

	return pkgs, complete, nil
}

func (db *PackageDatabase) Get(fqn string) (spec.SpecDbData, error) {
	contents, err := db.Read()
	if err != nil {
		return spec.SpecDbData{}, err
	}
	return contents.Packages[fqn], nil
}
