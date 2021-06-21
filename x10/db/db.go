package db

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

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

	return contents, nil
}

func (db *PackageDatabase) Read() (*PackageDatabaseContents, error) {
	lock := flock.New(db.BackingFile + ".lock")
	lock.RLock()
	defer lock.Close()

	contents, err := db.unlocked_Read()
	return contents, err
}

func (db *PackageDatabase) Update(pkg spec.SpecLayer) error {
	// Attempt to grab generated dependencies
	dbpkg := pkg.ToDB()
	dbpkg.GeneratedValid = true
	gen_depends, err := ioutil.ReadFile(filepath.Join("targetdir", "destdir", pkg.GetFQN(), "generated-depends"))
	if err == nil {
		dbpkg.GeneratedDepends = strings.Split(strings.TrimSpace(string(gen_depends)), "\n")
	} else {
		dbpkg.GeneratedValid = false
	}
	gen_provides, err := ioutil.ReadFile(filepath.Join("targetdir", "destdir", pkg.GetFQN(), "generated-provides"))
	if err == nil {
		dbpkg.GeneratedProvides = strings.Split(strings.TrimSpace(string(gen_provides)), "\n")
	} else {
		dbpkg.GeneratedValid = false
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

	d, err := yaml.Marshal(contents)
	if err != nil {
		return err
	}

	err = ioutil.WriteFile(db.BackingFile, d, os.ModePerm)
	logrus.Info("Updated package database.")
	return err
}
