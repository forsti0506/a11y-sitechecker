import { Config } from '../models/config';
import { A11ySitecheckerResult } from '../models/a11y-sitechecker-result';

export function defineExtraTags(sitecheckerResult: A11ySitecheckerResult, config: Config): void {
    if (config.idTags) {
        const idTags = config.idTags;
        sitecheckerResult.violations.forEach((v) => {
            if (idTags[v.id]) {
                if (v.customTags) {
                    v.customTags.push(...idTags[v.id]);
                } else {
                    v.customTags = idTags[v.id];
                }
            }
        });
        sitecheckerResult.inapplicable.forEach((v) => {
            if (idTags[v.id]) {
                if (v.customTags) {
                    v.customTags.push(...idTags[v.id]);
                } else {
                    v.customTags = idTags[v.id];
                }
            }
        });
        sitecheckerResult.incomplete.forEach((v) => {
            if (idTags[v.id]) {
                if (v.customTags) {
                    v.customTags.push(...idTags[v.id]);
                } else {
                    v.customTags = idTags[v.id];
                }
            }
        });
        sitecheckerResult.passes.forEach((v) => {
            if (idTags[v.id]) {
                if (v.customTags) {
                    v.customTags.push(...idTags[v.id]);
                } else {
                    v.customTags = idTags[v.id];
                }
            }
        });
    }
}
