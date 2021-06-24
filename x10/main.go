package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/davecgh/go-spew/spew"
	"github.com/sirupsen/logrus"
	"m0rg.dev/x10/conf"
	"m0rg.dev/x10/db"
	"m0rg.dev/x10/lib"
	"m0rg.dev/x10/spec"
)

func main() {
	logrus.SetOutput(os.Stderr)
	if _, ok := os.LookupEnv("X10_DEBUG"); ok {
		logrus.SetLevel(logrus.DebugLevel)
	}
	buildCmd := flag.NewFlagSet("build", flag.ExitOnError)
	//buildStage := buildCmd.String("stage", "", "Run only a specific stage.")
	buildMaybe := buildCmd.Bool("maybe", false, "Only build if the package is outdated in the database.")

	if len(os.Args) < 2 {
		fmt.Printf("Usage: %s <subcommand> ...\n", os.Args[0])
		os.Exit(1)
	}

	switch os.Args[1] {
	case "gensum":
		pkgsrc := os.Args[2]
		pkg := spec.LoadPackage(pkgsrc)

		lib.RunStage(pkg, "fetch")
		lib.RunStage(pkg, "_gensum")
	case "build":
		buildCmd.Parse(os.Args[2:])
		pkgsrc := buildCmd.Arg(0)
		db := db.PackageDatabase{BackingFile: conf.PkgDb()}
		contents, err := db.Read()
		if err != nil {
			logrus.Fatal(err)
		}
		pkg := spec.LoadPackage(pkgsrc)

		if (buildMaybe == nil || !*buildMaybe) ||
			!contents.CheckUpToDate(pkg) ||
			!contents.Packages[pkg.GetFQN()].GeneratedValid {
			// if len(*buildStage) > 0 {
			// 	err := lib.RunStage(pkg, *buildStage)
			// 	if err != nil {
			// 		logrus.Fatal(err)
			// 	}
			// } else {
			// 	for _, stage := range *pkg.StageOrder {
			// 		err := lib.RunStage(pkg, stage)
			// 		if err != nil {
			// 			logrus.Fatal(err)
			// 		}
			// 	}
			// }
			lib.Build(db, pkg)
		}
	case "show":
		buildCmd.Parse(os.Args[2:])
		pkgsrc := buildCmd.Arg(0)
		pkg := spec.LoadPackage(pkgsrc)
		spew.Dump(pkg)
	case "showdb":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		contents, err := pkgdb.Read()
		if err != nil {
			logrus.Fatal(err)
		}
		spew.Dump(contents)
	case "index":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		err := pkgdb.IndexFromRepo()
		if err != nil {
			logrus.Fatal(err)
		}
	case "list_install":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := os.Args[2]

		pkgs, _, err := pkgdb.GetInstallDeps(atom, db.DepRun)
		if err != nil {
			logrus.Fatal(err)
		}

		for _, pkg := range pkgs {
			fmt.Println(pkg.GetFQN())
		}
	case "list_build":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := os.Args[2]

		pkgs, complete, err := pkgdb.GetInstallDeps(atom, db.DepBuild)
		if err != nil {
			logrus.Fatal(err)
		}

		for _, pkg := range pkgs {
			fmt.Println(pkg.GetFQN())
		}
		if !complete {
			logrus.Warn(" (package list may not be complete)")
		}
	case "install":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := os.Args[2]
		target := os.Args[3]

		pkgs, complete, err := pkgdb.GetInstallDeps(atom, db.DepRun)
		if err != nil {
			logrus.Fatal(err)
		}
		if !complete {
			logrus.Fatal("package list is not complete - build first")
		}

		for _, pkg := range pkgs {
			err = lib.Install(pkgdb, pkg, target)
			if err != nil {
				logrus.Fatal(err)
			}
		}
	}
}
