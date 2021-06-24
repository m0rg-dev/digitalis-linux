package lib

import (
	"github.com/sirupsen/logrus"
	"m0rg.dev/x10/db"
	"m0rg.dev/x10/spec"
)

func Build(pkgdb db.PackageDatabase, pkg spec.SpecLayer) {
	logrus.Infof("Finding dependencies: %s", pkg.GetFQN())
	complete := false
	var deps []spec.SpecDbData

	for !complete {
		var err error
		deps, complete, err = pkgdb.GetInstallDeps(pkg.GetFQN(), db.DepBuild)
		if err != nil {
			logrus.Fatal(err)
		}

		for _, dep := range deps {
			logrus.Infof(" => depends on %s", dep.GetFQN())
			if dep.GeneratedValid {
				logrus.Infof("  (already built)")
			} else {
				Build(pkgdb, spec.LoadPackage("pkgs/"+dep.Meta.Name+".yml"))
			}
		}
	}

	from_db, err := pkgdb.Get(pkg.GetFQN())
	if err != nil {
		logrus.Fatal(err)
	}
	if !from_db.GeneratedValid {
		for _, dep := range deps {
			err := Install(pkgdb, dep, "targetdir")
			if err != nil {
				logrus.Fatal(err)
			}
		}
		logrus.Infof("Building: %s", pkg.GetFQN())
		for _, stage := range *pkg.StageOrder {
			err := RunStage(pkg, stage)
			if err != nil {
				logrus.Fatal(err)
			}
		}
	}
}
