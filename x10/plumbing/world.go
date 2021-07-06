package plumbing

import (
	"github.com/sirupsen/logrus"
	"m0rg.dev/x10/db"
	"m0rg.dev/x10/pkgset"
)

func AddPackageToLocalWorld(logger *logrus.Entry, pkgdb db.PackageDatabase, root string, atom string) *pkgset.PackageSet {
	contents, err := pkgdb.Read()
	if err != nil {
		logger.Fatal(err)
	}

	pkg_fqn, err := contents.FindFQN(atom)
	if err != nil {
		logger.Fatal(err)
	}

	world, err := pkgset.Set("world", root)
	if err != nil {
		logger.Fatal(err)
	}

	world.Mark(*pkg_fqn)
	return world
}

func GetWorld(logger *logrus.Entry, root string) *pkgset.PackageSet {
	world, err := pkgset.Set("world", root)
	if err != nil {
		logger.Fatal(err)
	}
	return world
}
