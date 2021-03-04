import * as pkg from "../package";
import Buildroot from "./Buildroot";

export default abstract class BasePackage extends pkg.Package {
    _init() {
        super._init();
        this._build_import.push(new Buildroot());
    }
}