package lib

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/sirupsen/logrus"
	"m0rg.dev/x10/db"
	"m0rg.dev/x10/spec"
)

func Install(pkgdb db.PackageDatabase, pkg spec.SpecDbData, root string) error {
	installed, err := os.ReadFile(filepath.Join(root, "var", "db", "x10", "installed"))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			logrus.Warn("(created installed list)")
			os.MkdirAll(filepath.Join(root, "var", "db", "x10"), os.ModePerm)
		} else {
			return err
		}
	}

	installed_str := string(installed)
	installed_map := map[string]bool{}

	for _, line := range strings.Split(installed_str, "\n") {
		installed_map[strings.TrimSpace(line)] = true
	}

	if _, ok := installed_map[pkg.GetFQN()]; ok {
		logrus.Infof("Already installed: %s", pkg.GetFQN())
		return nil
	}

	logrus.Infof("Installing: %s -> %s", pkg.GetFQN(), root)

	tmp_path := filepath.Join(root, "tmp", "x10", pkg.GetFQN())

	err = os.MkdirAll(tmp_path, os.ModePerm)
	if err != nil {
		return err
	}
	extract_cmd := exec.Command("tar", "xvf", fmt.Sprintf("hostdir/binpkgs/%s.tar.xz", pkg.GetFQN()), "-C", tmp_path)
	extract_cmd.Run()

	filepath.WalkDir(tmp_path, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			logrus.Fatal(err)
		}
		target_path, err := filepath.Rel(tmp_path, path)
		if err != nil {
			logrus.Fatal(err)
		}

		if d.Type().IsRegular() && !strings.ContainsRune(target_path, '/') {
			// no files under /!
			return nil
		}

		target_path, err = filepath.Abs(filepath.Join(root, target_path))
		if err != nil {
			logrus.Fatal(err)
		}

		if d.IsDir() {
			err := os.Mkdir(target_path, os.ModePerm)
			if err != nil {
				if errors.Is(err, os.ErrExist) {
					logrus.Debugf(" -- %s", target_path)
				} else {
					logrus.Fatal(err)
				}
			} else {
				logrus.Debugf(" => %s", target_path)
			}
		} else {
			copy_cmd := exec.Command("cp", "-a", path, target_path)
			copy_cmd.Run()
			logrus.Debugf(" %s => %s", path, target_path)
			if copy_cmd.ProcessState.ExitCode() != 0 {
				logrus.Fatalf("%+v exited with code %d", copy_cmd.Args, copy_cmd.ProcessState.ExitCode())
			}
		}
		return nil
	})

	f, err := os.OpenFile(filepath.Join(root, "var", "db", "x10", "installed"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := f.WriteString(pkg.GetFQN() + "\n"); err != nil {
		return err
	}

	return nil
}
