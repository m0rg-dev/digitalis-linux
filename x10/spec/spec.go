package spec

import "strconv"

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

func (pkg SpecLayer) ToDB() SpecDbData {
	return SpecDbData{
		*pkg.Meta,
		pkg.Depends,
		false,
		[]string{},
		[]string{},
	}
}
