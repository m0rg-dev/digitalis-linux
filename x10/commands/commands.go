package commands

import (
	"fmt"
	"os"
)

type Command interface {
	Run(args []string)
}

var registry = map[string]Command{}

func RegisterCommand(name string, cmd Command) {
	registry[name] = cmd
}

func RunCommand(name string, args []string) {
	cmd, ok := registry[name]
	if ok {
		cmd.Run(args)
	} else {
		fmt.Printf("Usage: %s <subcommand> ...\n", os.Args[0])
		os.Exit(1)
	}
}
