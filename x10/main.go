package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/davecgh/go-spew/spew"
	"m0rg.dev/x10/conf"
	"m0rg.dev/x10/db"
	"m0rg.dev/x10/lib"
	"m0rg.dev/x10/spec"
	"m0rg.dev/x10/x10_log"
)

func main() {

	buildCmd := flag.NewFlagSet("build", flag.ExitOnError)
	//buildStage := buildCmd.String("stage", "", "Run only a specific stage.")
	buildMaybe := buildCmd.Bool("maybe", false, "Only build if the package is outdated in the database.")
	buildDeps := buildCmd.Bool("with_deps", false, "Build a package's runtime dependencies after building it.")

	installPlanCmd := flag.NewFlagSet("install_plan", flag.ExitOnError)
	installPlanDot := installPlanCmd.Bool("dot", false, "Print .dot of dependency graph to stdout")

	if len(os.Args) < 2 {
		fmt.Printf("Usage: %s <subcommand> ...\n", os.Args[0])
		os.Exit(1)
	}

	logger := x10_log.Get("main")

	switch os.Args[1] {
	case "gensum":
		pkgsrc := os.Args[2]
		pkg := spec.LoadPackage(pkgsrc)

		lib.RunStage(pkg, "fetch")
		lib.RunStage(pkg, "_gensum")
	case "build":
		buildCmd.Parse(os.Args[2:])
		pkgsrc := buildCmd.Arg(0)
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		contents, err := pkgdb.Read()
		if err != nil {
			logger.Fatal(err)
		}
		pkg := spec.LoadPackage(pkgsrc)

		if (buildMaybe == nil || !*buildMaybe) ||
			!contents.CheckUpToDate(pkg) ||
			!contents.Packages[pkg.GetFQN()].GeneratedValid {
			pkgdb.Update(pkg, true)
			lib.Build(pkgdb, pkg)

			if buildDeps != nil && *buildDeps {
				complete := false
				var deps []spec.SpecDbData
				for !complete {
					var err error
					deps, complete, err = pkgdb.GetInstallDeps(pkg.GetFQN(), db.DepRun)
					if err != nil {
						logger.Fatal(err)
					}

					for _, dep := range deps {
						logger.Infof(" => depends on %s", dep.GetFQN())
						if dep.GeneratedValid {
							logger.Infof("  (already built)")
						} else {
							lib.Build(pkgdb, spec.LoadPackage(filepath.Join(conf.PackageDir(), dep.Meta.Name+".yml")))
						}
					}
				}
			}
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
			logger.Fatal(err)
		}
		spew.Dump(contents)
	case "index":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		err := pkgdb.IndexFromRepo()
		if err != nil {
			logger.Fatal(err)
		}
	case "list_install":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := os.Args[2]

		pkgs, _, err := pkgdb.GetInstallDeps(atom, db.DepRun)
		if err != nil {
			logger.Fatal(err)
		}

		for _, pkg := range pkgs {
			fmt.Println(pkg.GetFQN())
		}
	case "list_build":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := os.Args[2]

		pkgs, complete, err := pkgdb.GetInstallDeps(atom, db.DepBuild)
		if err != nil {
			logger.Fatal(err)
		}

		for _, pkg := range pkgs {
			fmt.Println(pkg.GetFQN())
		}
		if !complete {
			logger.Warn(" (package list may not be complete)")
		}
	case "install":
		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := os.Args[2]
		target := os.Args[3]

		pkgs, complete, err := pkgdb.GetInstallDeps(atom, db.DepRun)
		if err != nil {
			logger.Fatal(err)
		}
		if !complete {
			logger.Fatal("package list is not complete - build first")
		}

		for _, pkg := range pkgs {
			err = lib.Install(pkgdb, pkg, target)
			if err != nil {
				logger.Fatal(err)
			}
		}
	case "install_plan":
		installPlanCmd.Parse(os.Args[2:])

		pkgdb := db.PackageDatabase{BackingFile: conf.PkgDb()}
		atom := installPlanCmd.Arg(0)

		contents, err := pkgdb.Read()
		if err != nil {
			logger.Fatal(err)
		}
		pkgs, complete, err := pkgdb.GetInstallDeps(atom, db.DepRun)
		if err != nil {
			logger.Fatal(err)
		}
		if !complete {
			logger.Fatal("package list is not complete - build first")
		}

		for _, pkg := range pkgs {
			logger.Infof(" => %s", pkg.GetFQN())
		}

		if (installPlanDot != nil) && *installPlanDot {
			fmt.Println("digraph {")
			fmt.Println("  rankdir = TB;")
			for idx, pkg := range pkgs {
				fmt.Printf("  \"%s\" [label=\"%d\\n%s\" shape=box];\n", pkg.GetFQN(), idx, pkg.Meta.Name)
				seen := map[string]bool{}
				for _, depend := range append(pkg.Depends.Run, pkg.GeneratedDepends...) {
					fqn := contents.ProviderIndex[depend]
					if !seen[fqn] {
						fmt.Printf("  \"%s\" -> \"%s\"\n", pkg.GetFQN(), fqn)
					}
					seen[fqn] = true
				}
			}
			fmt.Println("}")
		}
	}
}
