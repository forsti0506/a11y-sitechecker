import { v4 as uuidv4 } from 'uuid';
import { A11ySitecheckerResult } from '../models/a11y-sitechecker-result';
import { AnalyzedSite, FilesByDate } from '../models/analyzed-site';
import { Config } from '../models/config';
import { defineExtraTags } from './define-extratags';
import { setupSiteresult } from './setup-siteresult';
import { getEscaped, log } from './helper-functions';
import { readFileSync, writeFileSync } from 'fs';

export async function saveResultsToFile(
    config: Config,
    sitecheckerResult: A11ySitecheckerResult,
    i: number,
): Promise<void> {
    log('#############################################################################################');
    log('Updating resultsFolder with file with Current Time Result');
    log('#############################################################################################');
    const currentDate = new Date();
    const dateToSave = String(
        currentDate.getDate().toLocaleString().padStart(2, '0') +
            '_' +
            (currentDate.getMonth() + 1).toLocaleString().padStart(2, '0') +
            '_' +
            currentDate.getFullYear() +
            '_' +
            currentDate.getHours().toLocaleString().padStart(2, '0') +
            '_' +
            currentDate.getMinutes().toLocaleString().padStart(2, '0') +
            '_' +
            currentDate.getSeconds().toLocaleString().padStart(2, '0') +
            '_' +
            sitecheckerResult.testEnvironment?.windowWidth +
            '_' +
            sitecheckerResult.testEnvironment?.windowHeight,
    );

    const fileToSave = config.resultsPathPerUrl + dateToSave + '.json';
    let fileObject: AnalyzedSite[];
    let id: string;
    try {
        const data = readFileSync(config.resultsPath + 'files.json');
        fileObject = JSON.parse(data.toString());
        if (fileObject.filter((f) => f.url.includes(config.name)).length > 0) {
            id = fileObject.filter((f) => f.url.includes(config.name))[0]._id;
            if (i === 0) {
                const filesByDate = fileObject.filter((f) => f.url.includes(config.name))[0].filesByDate;
                filesByDate.push({
                    date: new Date(),
                    files: [fileToSave],
                });
            } else {
                const filesByDate = fileObject.filter((f) => f.url.includes(config.name))[0].filesByDate;
                filesByDate[filesByDate.length - 1].files.push(fileToSave);
            }
        } else {
            id = uuidv4();
            fileObject.push({
                _id: id,
                url: config.name,
                filesByDate: [
                    {
                        date: new Date(),
                        files: [fileToSave],
                    },
                ],
            });
        }
    } catch (_e) {
        id = uuidv4();
        const fileResult: FilesByDate = {
            date: new Date(),
            files: [fileToSave],
        };
        fileObject = new Array({ _id: id, url: config.name, filesByDate: [fileResult] });
    }

    const siteResult = setupSiteresult(id, sitecheckerResult);
    defineExtraTags(sitecheckerResult, config);
    writeFileSync(fileToSave, JSON.stringify(siteResult, null, 4));
    writeFileSync(config.resultsPath + 'files.json', JSON.stringify(fileObject, null, 4));
    const basePath =
        config.resultsPathPerUrl +
        getEscaped(id) +
        '_' +
        sitecheckerResult.testEnvironment?.windowWidth +
        '_' +
        sitecheckerResult.testEnvironment?.windowHeight;

    const violationsPath = basePath + '_violations.json';
    const incompletesPath = basePath + '_incompletes.json';
    const passesPath = basePath + '_passes.json';
    const inapplicablesPath = basePath + '_inapplicables.json';

    writeFileSync(violationsPath, JSON.stringify(sitecheckerResult.violations, null, 4));
    writeFileSync(incompletesPath, JSON.stringify(sitecheckerResult.incomplete, null, 4));
    writeFileSync(passesPath, JSON.stringify(sitecheckerResult.passes, null, 4));
    writeFileSync(inapplicablesPath, JSON.stringify(sitecheckerResult.inapplicable, null, 4));
}
