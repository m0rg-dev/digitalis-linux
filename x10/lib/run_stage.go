package lib

import (
	"bufio"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/sirupsen/logrus"
)

func (pkg SpecLayer) RunStage(stage string) error {
	logrus.Info("Running " + stage + " for " + pkg.GetFQN())

	if pkg.Stages[stage] == nil {
		logrus.Info("  <empty stage>")
		return nil
	}

	_, b, _, _ := runtime.Caller(0)
	basepath, _ := filepath.Abs(filepath.Join(filepath.Dir(b), ".."))

	os.MkdirAll(basepath+"/hostdir", os.ModePerm)
	os.MkdirAll(basepath+"/targetdir", os.ModePerm)

	cmd := exec.Command(
		"docker", "run", "--rm", "-i",
		"-v", basepath+"/hostdir:/hostdir",
		"-v", basepath+"/targetdir:/targetdir",
		"x10_bootstrap",
		"bash", "-e", "-x",
	)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	stdout_lines := []string{}
	stderr_lines := []string{}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			logrus.Debug("[" + stage + " stdout] " + scanner.Text())
			stdout_lines = append(stdout_lines, scanner.Text())
		}
	}()

	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			logrus.Debug("[" + stage + " stderr] " + scanner.Text())
			stderr_lines = append(stderr_lines, scanner.Text())
		}
	}()

	cmd.Start()

	stdin.Write([]byte(pkg.GetEnvironmentSetupScript() + "\n"))

	if *pkg.Stages[stage].UseWorkdir {
		stdin.Write([]byte("cd \"$X10_WORKDIR\"\n"))
	}

	for _, pre_script := range pkg.Stages[stage].PreScript {
		stdin.Write([]byte(pre_script + "\n"))
	}
	if pkg.Stages[stage].Script != nil {
		stdin.Write([]byte(*pkg.Stages[stage].Script + "\n"))
	}
	for _, post_script := range pkg.Stages[stage].PostScript {
		stdin.Write([]byte(post_script + "\n"))
	}
	stdin.Close()

	err = cmd.Wait()
	wg.Wait()

	if err != nil {
		logrus.Error("Stage " + stage + " for " + pkg.GetFQN() + " failed!")
		logrus.Error("Failing stage stdout output is:")
		for _, line := range stdout_lines {
			logrus.Error("  " + line)
		}
		logrus.Error("Failing stage stderr output is:")
		for _, line := range stderr_lines {
			logrus.Error("  " + line)
		}
	}

	return err
}
