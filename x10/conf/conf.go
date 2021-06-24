package conf

import (
	"os"
	"path/filepath"
	"strings"
)

func get(key string, def string) string {
	from_env, ok := os.LookupEnv(strings.ToUpper("x10_" + key))
	if !ok {
		from_env = def
	}
	return from_env
}

func TargetDir() string {
	return get("targetdir", "targetdir")
}

func PkgDb() string {
	rc := filepath.Join(TargetDir(), "etc", "x10", "pkgdb.yml")
	os.MkdirAll(filepath.Join(TargetDir(), "etc", "x10"), os.ModePerm)
	return rc
}
