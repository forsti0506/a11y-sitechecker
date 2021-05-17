import { A11ySitecheckerResult } from '../models/a11y-sitechecker-result';
import { Config } from '../models/config';
import { getEscaped, log } from './helper-functions';
import fs from 'fs';
import { AnalyzedSite, FilesByDate } from '../models/analyzed-site';

import { v4 as uuidv4 } from 'uuid';
import { setupSiteresult } from '../utils/setup-siteresult';
import { defineExtraTags } from '../utils/define-extratags';
import { getCountings } from '../utils/get-countings';
import { SiteResult } from '../models/site-result';

export async function saveResultsToFile(config: Config, sitecheckerResult: A11ySitecheckerResult, i: number, url: string): Promise<void> {
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
            sitecheckerResult.testEnvironment?.windowWidth +
            '_' +
            sitecheckerResult.testEnvironment?.windowHeight,
    );

    const fileToSave = config.resultsPathPerUrl + dateToSave + '.json';
    let fileObject: AnalyzedSite[];
    let id: string;
    try {
        const data = fs.readFileSync(config.resultsPath + 'files.json');
        fileObject = JSON.parse(data.toString());
        if (fileObject.filter((f) => f.url.includes(sitecheckerResult.url)).length > 0) {
            id = fileObject.filter((f) => f.url.includes(sitecheckerResult.url))[0]._id;
            if (i === 0) {
                const filesByDate = fileObject.filter((f) => f.url.includes(sitecheckerResult.url))[0].filesByDate;
                filesByDate.push({
                    date: new Date(),
                    files: [fileToSave],
                });
            } else {
                const filesByDate = fileObject.filter((f) => f.url.includes(sitecheckerResult.url))[0].filesByDate;
                filesByDate[filesByDate.length - 1].files.push(fileToSave);
            }
        } else {
            id = uuidv4();
            fileObject.push({
                _id: id,
                url: sitecheckerResult.url,
                filesByDate: [
                    {
                        date: new Date(),
                        files: [fileToSave],
                    },
                ],
            });
        }
    } catch (e) {
        id = uuidv4();
        const fileResult: FilesByDate = {
            date: new Date(),
            files: [fileToSave],
        };
        fileObject = [{ _id: id, url: url, filesByDate: [fileResult] }];
    }

    const siteResult = setupSiteresult(id, sitecheckerResult);
    fileObject = [];
    defineExtraTags(sitecheckerResult, config);
    fs.writeFileSync(fileToSave, JSON.stringify(siteResult, null, 4));
    fs.writeFileSync(config.resultsPath + 'files.json', JSON.stringify({fileObject}, null, 4));

    const violationsPath =
        config.resultsPathPerUrl +
        getEscaped(id + sitecheckerResult.timestamp) +
        '_' +
        sitecheckerResult.testEnvironment?.windowWidth +
        '_' +
        sitecheckerResult.testEnvironment?.windowHeight +
        '_violations.json';
    await fs.promises.writeFile(violationsPath, JSON.stringify(sitecheckerResult.violations, null, 4));

    const incompletesPath =
        config.resultsPathPerUrl +
        getEscaped(id + sitecheckerResult.timestamp) +
        '_' +
        sitecheckerResult.testEnvironment?.windowWidth +
        '_' +
        sitecheckerResult.testEnvironment?.windowHeight +
        '_incompletes.json';
    await fs.promises.writeFile(incompletesPath, JSON.stringify(sitecheckerResult.incomplete, null, 4));

    const passesPath =
        config.resultsPathPerUrl +
        getEscaped(id + sitecheckerResult.timestamp) +
        '_' +
        sitecheckerResult.testEnvironment?.windowWidth +
        '_' +
        sitecheckerResult.testEnvironment?.windowHeight +
        '_passes.json';
    await fs.promises.writeFile(passesPath, JSON.stringify(sitecheckerResult.passes, null, 4));

    const inapplicablesPath =
        config.resultsPathPerUrl +
        getEscaped(id + sitecheckerResult.timestamp) +
        '_' +
        sitecheckerResult.testEnvironment?.windowWidth +
        '_' +
        sitecheckerResult.testEnvironment?.windowHeight +
        '_inapplicables.json';
    await fs.promises.writeFile(inapplicablesPath, JSON.stringify(sitecheckerResult.inapplicable, null, 4));

    const filesJson: AnalyzedSite[] = JSON.parse(fs.readFileSync(config.resultsPath + 'files.json').toString());
    const relatedDates = filesJson.filter((f) => f._id === id)[0].filesByDate;
    if (relatedDates.length > 1) {
        for (const [i, file] of relatedDates.entries()) {
            if (i < relatedDates.length - 1) {
                for (const f of file.files) {
                    const resultFile: SiteResult = JSON.parse(fs.readFileSync(f).toString());
                    await getCountings(
                        id,
                        resultFile.timestamp,
                        '_' +
                            resultFile.testEnvironment?.windowWidth +
                            '_' +
                            resultFile.testEnvironment?.windowHeight +
                            '_violations.json',
                        config.resultsPathPerUrl,
                    );
                    await getCountings(
                        id,
                        resultFile.timestamp,
                        '_' +
                            resultFile.testEnvironment?.windowWidth +
                            '_' +
                            resultFile.testEnvironment?.windowHeight +
                            '_passes.json',
                        config.resultsPathPerUrl,
                    );
                    await getCountings(
                        id,
                        resultFile.timestamp,
                        '_' +
                            resultFile.testEnvironment?.windowWidth +
                            '_' +
                            resultFile.testEnvironment?.windowHeight +
                            '_incompletes.json',
                        config.resultsPathPerUrl,
                    );
                    await getCountings(
                        id,
                        resultFile.timestamp,
                        '_' +
                            resultFile.testEnvironment?.windowWidth +
                            '_' +
                            resultFile.testEnvironment?.windowHeight +
                            '_inapplicables.json',
                        config.resultsPathPerUrl,
                    );
                }
            }
        }
    }
}
