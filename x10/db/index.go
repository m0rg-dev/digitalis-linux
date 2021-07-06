package db

import (
	"io/fs"
	"os"
	"path/filepath"
	"sync"

	"github.com/gofrs/flock"
	"m0rg.dev/x10/conf"
	"m0rg.dev/x10/spec"
	"m0rg.dev/x10/x10_log"
)

func (db *PackageDatabase) IndexFromRepo() error {
	logger := x10_log.Get("index").WithField("db", db.BackingFile)
	lock := flock.New(db.BackingFile + ".lock")
	lock.Lock()
	defer lock.Close()

	contents, err := db.unlocked_Read()
	if err != nil {
		return err
	}

	var wg sync.WaitGroup
	var updates sync.Map

	filepath.WalkDir(conf.PackageDir(), func(path string, d fs.DirEntry, err error) error {
		if d.Name() == "layers" {
			return fs.SkipDir
		}
		if d.Type().IsRegular() {
			wg.Add(1)
			go func() {
				local_logger := logger.WithField("pkgsrc", path)
				local_logger.Infof("Indexing")

				from_repo := spec.LoadPackage(path)
				srcstat, err := os.Stat(path)
				if err != nil {
					panic(err)
				}
				pkgstat, err := os.Stat(filepath.Join(conf.HostDir(), "binpkgs", from_repo.GetFQN()+".tar.xz"))
				doupdate := false

				if !contents.CheckUpToDate(from_repo) {
					local_logger.Infof("Updating database (outdated)")
					doupdate = true
				}

				if !contents.Packages[from_repo.GetFQN()].GeneratedValid {
					local_logger.Infof("Updating database (not built)")
					doupdate = true
				}

				if err != nil {
					local_logger.Infof("Updating database (stat error on binpkg)")
					doupdate = true
				}

				if srcstat != nil && pkgstat != nil && srcstat.ModTime().Unix() > pkgstat.ModTime().Unix() {
					local_logger.Infof("Updating database (source is newer)")
					doupdate = true
				}

				if doupdate {
					repo_to_db := from_repo.ToDB()
					updates.Store(from_repo.GetFQN(), repo_to_db)
				}
				wg.Done()
			}()
		}

		return nil
	})

	wg.Wait()
	updates.Range(func(key interface{}, value interface{}) bool {
		fqn := key.(string)
		dbpkg := value.(spec.SpecDbData)
		contents.Packages[fqn] = dbpkg
		return true
	})

	logger.Infof("Rebuilding provider cache")
	contents.ProviderIndex = map[string]string{}
	for fqn, dbpkg := range contents.Packages {
		logger.Debugf(" => " + fqn)
		if dbpkg.GeneratedValid {
			for _, prov := range dbpkg.GeneratedProvides {
				contents.maybeAddProvider(prov, fqn)
			}
		}
		contents.maybeAddProvider(dbpkg.Meta.Name, fqn)
	}

	db.unlocked_Write(contents)
	logger.Info("Updated package database in " + db.BackingFile + ".")
	return nil
}
