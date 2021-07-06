package plumbing

import (
	"path/filepath"

	"m0rg.dev/x10/conf"
	"m0rg.dev/x10/db"
	"m0rg.dev/x10/lib"
	"m0rg.dev/x10/spec"
	"m0rg.dev/x10/x10_log"
)

func Build(pkgdb db.PackageDatabase, pkg spec.SpecLayer) {
	logger := x10_log.Get("build").WithField("pkg", pkg.GetFQN())
	logger.Info("Finding dependencies")
	complete := false
	var deps []spec.SpecDbData

	if conf.ResetPackages() {
		Reset(logger, conf.TargetDir())
	}

	for !complete {
		local_logger := logger.WithField("type", "build")
		var err error
		var deps_2 []spec.SpecDbData
		deps_2, complete, err = pkgdb.GetInstallDeps(pkg.GetFQN(), db.DepBuild)
		deps = append(deps, deps_2...)
		if err != nil {
			local_logger.Fatal(err)
		}

		for _, dep := range deps_2 {
			local_logger.Infof(" => depends on %s", dep.GetFQN())
			if dep.GeneratedValid {
				local_logger.Infof("  (already built)")
			} else {
				Build(pkgdb, spec.LoadPackage(filepath.Join(conf.PackageDir(), dep.Meta.Name+".yml")))
			}
		}
	}

	complete = false

	for !complete {
		local_logger := logger.WithField("type", "test")
		var err error
		var deps_2 []spec.SpecDbData
		// TODO this should all be per-stage
		deps_2, complete, err = pkgdb.GetInstallDeps(pkg.GetFQN(), db.DepTest)
		deps = append(deps, deps_2...)
		if err != nil {
			local_logger.Fatal(err)
		}

		for _, dep := range deps {
			local_logger.Infof(" => depends on %s", dep.GetFQN())
			if dep.GeneratedValid {
				local_logger.Infof("  (already built)")
			} else {
				Build(pkgdb, spec.LoadPackage(filepath.Join(conf.PackageDir(), dep.Meta.Name+".yml")))
			}
		}
	}

	from_db, err := pkgdb.Get(pkg.GetFQN())
	if err != nil {
		logger.Fatal(err)
	}
	if !from_db.GeneratedValid {
		for _, dep := range deps {
			err := lib.Install(pkgdb, dep, conf.TargetDir())
			if err != nil {
				logger.Fatal(err)
			}
		}
		logger.Infof("Building: %s", pkg.GetFQN())
		for _, stage := range *pkg.StageOrder {
			err := lib.RunStage(pkg, stage)
			if err != nil {
				logger.Fatal(err)
			}
		}
	}
}
