import fs from 'fs';
import { FullCheckerSingleResult } from '../models/a11y-sitechecker-result';
import { Config } from '../models/config';
import { getEscaped } from './helper-functions';

export async function getCountings(
    id: string,
    timestamp: string,
    fileEnding: string,
    config: Config
): Promise<void> {
    const violationsResultFile: FullCheckerSingleResult[] | Map<string, number> = JSON.parse(
        fs.readFileSync(config.resultsPathPerUrl + getEscaped(id + timestamp) + fileEnding).toString(),
    );
    const violationCountingsByUrl: Map<string, number> = new Map<string, number>();
    if (violationsResultFile[0]?.id !== undefined) {
        for (const fullCheckerSingleResult of violationsResultFile) {
            if(fileEnding.includes('inapplicables')) {
                const savedName = config.name + fileEnding.replace('_inapplicables', '')
                const elment = violationCountingsByUrl.get(savedName);
                    if (elment) {
                        violationCountingsByUrl.set(savedName, elment + 1);
                    } else {
                        violationCountingsByUrl.set(savedName, 1);
                    }
            } else {
                (fullCheckerSingleResult as FullCheckerSingleResult).nodes.forEach((node) =>
                node.targetResult.urls.forEach((u) => {
                    const elment = violationCountingsByUrl.get(u);
                    if (elment) {
                        violationCountingsByUrl.set(u, elment + 1);
                    } else {
                        violationCountingsByUrl.set(u, 1);
                    }
                }),
            );
            }

        }
        const jsonmap: { [key: string]: number } = {};
        violationCountingsByUrl.forEach((value, key) => {
            jsonmap[key] = value;
        });
        await fs.promises.writeFile(
            config.resultsPathPerUrl + getEscaped(id + timestamp) + fileEnding,
            JSON.stringify(jsonmap, null, 4),
        );
    } else {
        return;
    }
}
