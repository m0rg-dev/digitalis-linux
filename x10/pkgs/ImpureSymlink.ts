import Spec, { pkgmeta, BuildStep, CreateSymlinkStep } from '../Spec';

export default class ImpureSymlink extends Spec {
    link_name: string;
    target: string;

    constructor(link_name: string, target: string) {
        super();
        this.link_name = link_name;
        this.target = target;
    }

    meta = (): pkgmeta => ({
        name: `ImpureSymlink.${this.target.replace(/[^A-Za-z0-9_-]/g, '_')}`,
        url: "",
        version: "0.1",
        release: 1,
        summary: "",
        license: "0BSD",
        nocache: true
    });

    steps = (): { [key: string]: BuildStep }  => ({
        "configure": undefined,
        "make": undefined,
        "install": new CreateSymlinkStep(this.link_name, this.target)
    });
}