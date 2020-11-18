import fs = require('fs');
import child_process = require('child_process');
import https = require('https');
import { TUI } from './TUI';

export type UpdateResult = {
    spec: string,
    new_version: string | null,
    skipped: boolean,
    error: string | null,
    update_link?: string
}

// https://stackoverflow.com/a/6832721
function versionCompare(v1, v2, options) {
    var lexicographical = options && options.lexicographical,
        zeroExtend = options && options.zeroExtend,
        v1parts = v1.split('.'),
        v2parts = v2.split('.');

    function isValidPart(x) {
        return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
    }

    if (zeroExtend) {
        while (v1parts.length < v2parts.length) v1parts.push("0");
        while (v2parts.length < v1parts.length) v2parts.push("0");
    }

    if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length == i) {
            return 1;
        }

        if (v1parts[i] == v2parts[i]) {
            continue;
        }
        else if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        else {
            return -1;
        }
    }

    if (v1parts.length != v2parts.length) {
        return -1;
    }

    return 0;
}

export class Updater {
    static async run(tui: TUI, specnames: string[]) {
        const specs = specnames.length
            ? specnames
            : (await fs.promises.readdir('../rpmbuild/SPECS')).filter(file => file.endsWith('.spec'));
        const reads: Promise<void>[] = [];
        const spec_contents = new Map<string, string>();
        for (const spec of specs) {
            reads.push(fs.promises.readFile(`../rpmbuild/SPECS/${spec}`)
                .then(contents => { spec_contents.set(spec, contents.toString()); }));
        }
        await Promise.all(reads);
        const results: UpdateResult[] = [];
        // do this mostly synchronously to not thrash network
        for (const spec of specs) {
            const update_spec = spec_contents
                .get(spec)
                .split("\n")
                .filter(line => line.startsWith("# X10-Update-Spec: "))
                .map(line => line.replace("# X10-Update-Spec: ", ""))
                .join(" ");
            if (update_spec.length) {
                tui.updateUpdateState(results, spec);
                try {
                    const update_json = JSON.parse(update_spec);
                    var latest_version: string;
                    if (update_json.type == 'git-tags') {
                        if (!update_json.repo || !update_json.pattern)
                            throw new Error("update type git-tags needs repo and pattern");
                        const git = child_process.spawnSync('git', ['ls-remote', '--sort=-version:refname', '--tags', update_json.repo]);
                        const tags = git.output[1].toString().split("\n")
                            .filter(s => s && s.length)
                            .map(s => s.split("refs/tags/")[1])
                            .map(s => s.trim());
                        for (const possible_tag of tags) {
                            if (possible_tag.match(update_json.pattern)) {
                                latest_version = possible_tag.match(update_json.pattern)[1];
                                break;
                            }
                        }
                    } else if (update_json.type == 'webscrape') {
                        if (!update_json.url) {
                            throw new Error("update type webscrape needs url");
                        }
                        // default is just a "match things that look like links to tarballs"
                        if (!update_json.pattern) update_json.pattern = "(?:href=\"|/)\\w+-((?:\\d+\\.)*\\d+)\\.tar\\..z2?\"";
                        const content = child_process.execSync(`curl -s -L "${update_json.url}"`).toString();
                        const matches = [...content.matchAll(update_json.pattern)].map(m => m[1]);
                        if (matches.length) {
                            latest_version = matches.sort((a, b) => versionCompare(b, a, update_json.compare_opts || {}))[0];
                        }
                    } else if (update_json.type == 'none') {
                        latest_version = "x";
                    } else {
                        throw new Error(`unknown update type ${update_json.type}`);
                    }
                    if (latest_version) {
                        const spec_version = child_process.execSync(`rpmspec -q --qf '%{version}\\n' --define '_build %{_target}' --define '_host %{_build}' ../rpmbuild/SPECS/${spec} 2>/dev/null`).toString().split("\n")[0].trim();
                        if (latest_version == spec_version || update_json.type == 'none') {
                            results.push({ spec: spec, new_version: undefined, skipped: false, error: undefined });
                        } else {
                            const update_link = child_process.execSync(`rpmspec -q --qf '%{url}\\n' --define '_build %{_target}' --define '_host %{_build}' ../rpmbuild/SPECS/${spec} 2>/dev/null`).toString().split("\n")[0].trim();
                            results.push({ spec: spec, new_version: latest_version, skipped: false, error: undefined, update_link: update_link });
                        }
                    } else {
                        throw new Error(`Didn't find any versions for ${spec}`);
                    }
                } catch (e) {
                    results.push({ spec: spec, new_version: undefined, skipped: false, error: e.toString() });
                }
            } else {
                results.push({ spec: spec, new_version: undefined, skipped: true, error: undefined });
            }
            tui.updateUpdateState(results, undefined);
        }
    }
}