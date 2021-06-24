package spec

import (
	"fmt"
	"io/ioutil"
	"strconv"

	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

type SpecMeta struct {
	Name        string
	Version     string
	Revision    int
	Maintainer  string
	Homepage    string
	License     string
	Description string
	UnpackDir   *string
}

type SpecDepend struct {
	HostBuild []string
	Build     []string
	Test      []string
	Run       []string
}

type SpecDbData struct {
	Meta              SpecMeta
	Depends           SpecDepend
	GeneratedValid    bool
	GeneratedDepends  []string
	GeneratedProvides []string
}

type SpecSource struct {
	URL      string
	Checksum string
}

type SpecStage struct {
	PreScript  []string
	Script     *string
	PostScript []string
	UseWorkdir *bool
}

type SpecLayer struct {
	Meta        *SpecMeta
	Depends     SpecDepend
	Sources     []SpecSource
	Stages      map[string]*SpecStage
	StageOrder  *[]string
	Environment map[string]string
	Workdir     string
}

type Spec struct {
	Layers  []string
	Package *SpecLayer
}

func (pkg SpecLayer) GetFQN() string {
	return pkg.Meta.Name + "-" + pkg.Meta.Version + "_" + strconv.Itoa(pkg.Meta.Revision)
}

func (pkg SpecDbData) GetFQN() string {
	return pkg.Meta.Name + "-" + pkg.Meta.Version + "_" + strconv.Itoa(pkg.Meta.Revision)
}

func (pkg SpecLayer) ToDB() SpecDbData {
	return SpecDbData{
		*pkg.Meta,
		pkg.Depends,
		false,
		[]string{},
		[]string{},
	}
}

func LoadPackage(pkgsrc string) SpecLayer {
	pkg := Spec{}

	// Load the package YAML
	logrus.Debug("Loading package: ", pkgsrc)
	pkgraw, err := ioutil.ReadFile(pkgsrc)
	if err != nil {
		logrus.Fatal(err)
	}

	err = yaml.UnmarshalStrict(pkgraw, &pkg)
	if err != nil {
		logrus.Fatal(err)
	}

	// Load and apply the layers.
	composite := SpecLayer{}

	layers := make([]SpecLayer, len(pkg.Layers)+1)
	for idx, layer_name := range pkg.Layers {
		logrus.Debug("Loading layer: ", layer_name)
		layers[idx] = LoadPackage(fmt.Sprintf("pkgs/layers/%s.yml", layer_name))
	}

	layers = append(layers, *pkg.Package)

	for _, layer := range layers {
		// Meta: Take the last complete struct.
		if layer.Meta != nil {
			composite.Meta = layer.Meta
		}

		// Depends: Concatenate arrays.
		composite.Depends.HostBuild = append(composite.Depends.HostBuild, layer.Depends.HostBuild...)
		composite.Depends.Build = append(composite.Depends.Build, layer.Depends.Build...)
		composite.Depends.Test = append(composite.Depends.Test, layer.Depends.Test...)
		composite.Depends.Run = append(composite.Depends.Run, layer.Depends.Run...)

		// Sources: Concatenate.
		composite.Sources = append(composite.Sources, layer.Sources...)

		// Stages: Piece-wise overlay.
		if composite.Stages == nil {
			composite.Stages = make(map[string]*SpecStage)
		}

		for name, stage := range layer.Stages {
			// Make sure we have an object.
			if _, ok := composite.Stages[name]; !ok {
				composite.Stages[name] = new(SpecStage)
				composite.Stages[name].UseWorkdir = new(bool)
				*composite.Stages[name].UseWorkdir = false
			}

			// Append pre- and post- arrays. Note ordering.
			composite.Stages[name].PreScript = append(composite.Stages[name].PreScript, stage.PreScript...)
			composite.Stages[name].PostScript = append(stage.PostScript, composite.Stages[name].PostScript...)

			// And take the script directly if present.
			if stage.Script != nil {
				composite.Stages[name].Script = stage.Script
			}

			// UseWorkdir: Take last.
			if stage.UseWorkdir != nil {
				composite.Stages[name].UseWorkdir = stage.UseWorkdir
			}
		}

		// StageOrder: Take the last complete array.
		if layer.StageOrder != nil {
			composite.StageOrder = layer.StageOrder
		}

		// Environment: Overlay map contents.
		if composite.Environment == nil {
			composite.Environment = make(map[string]string)
		}

		for name, value := range layer.Environment {
			composite.Environment[name] = value
		}

		// Workdir: Take last.
		if len(layer.Workdir) > 0 {
			composite.Workdir = layer.Workdir
		}
	}

	return composite
}
