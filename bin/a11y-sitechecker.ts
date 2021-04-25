#!/usr/bin/env node

// This file is the entry point if you using it throug the command line

import * as pkg from '../package.json';
import * as commander from 'commander';
import { entry } from '../lib/a11y-sitechecker';

import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';
import * as fs from 'fs';
import { error, getEscaped, log } from '../lib/utils/helper-functions';
import { AnalyzedSite, FilesByDate } from '../lib/models/analyzed-site';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { setupSiteresult } from '../lib/utils/setup-siteresult';
import { defineExtraTags } from '../lib/utils/define-extratags';
import { getCountings } from '../lib/utils/get-countings';
import { SiteResult } from '../lib/models/site-result';

commander
    .version(pkg.version)
    .usage('[options] <paths>')
    .option('-j, --json', 'Output results as JSON. Otherwise output is displayed on the console')
    .option('--config <string>', 'Provide a config.json')
    .option(
        '-T, --threshold <number>',
        'permit this number of errors, warnings, or notices, otherwise fail with exit code 2',
        '0',
    )
    .parse(process.argv);

(async (): Promise<void> => {
    const url = commander.args[0];
    if (url) {
        const config = setupConfig(commander.opts());
        const axeConfig = setupAxeConfig(config);
        let retCode = 0;
        try {
            const results = await entry(config, axeConfig, url);

            for (const [i, sitecheckerResult] of results.entries()) {
                if (config.db && config.db.type === 'mongodb') {
                    log(
                        '#############################################################################################',
                    );
                    log('Updating database with the current results)');
                    log(
                        '#############################################################################################',
                    );

                    const client = new MongoClient('mongodb+srv://' + config.db.url, {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        auth: { user: config.db.user, password: config.db.password },
                    });
                    await client.connect();

                    try {
                        const db = client.db('a11y-sitechecker-dashboard');
                        const dbSiteResult: AnalyzedSite[] = await db
                            .collection('sites')
                            .find<AnalyzedSite>({ url: sitecheckerResult.url }, {})
                            .toArray();
                        let id: string;
                        if (dbSiteResult.length > 0) {
                            id = dbSiteResult[0]._id;
                        } else {
                            id = uuidv4();
                            await db.collection('sites').insertOne({ _id: id, url: sitecheckerResult.url });
                        }
                        const siteResult = setupSiteresult(id, sitecheckerResult);

                        await db.collection('siteResults').insertOne({ siteResult });
                        defineExtraTags(sitecheckerResult, config);
                        await db.collection('violations').insertOne({
                            id: id,
                            timestamp: sitecheckerResult.timestamp,
                            violations: sitecheckerResult.violations,
                        });
                        await db.collection('passes').insertOne({
                            id: id,
                            timestamp: sitecheckerResult.timestamp,
                            violations: sitecheckerResult.passes,
                        });
                        await db.collection('incompletes').insertOne({
                            id: id,
                            timestamp: sitecheckerResult.timestamp,
                            violations: sitecheckerResult.incomplete,
                        });
                        await db.collection('inapplicables').insertOne({
                            id: id,
                            timestamp: sitecheckerResult.timestamp,
                            violations: sitecheckerResult.inapplicable,
                        });
                        await client.close();
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    log(
                        '#############################################################################################',
                    );
                    log('Updating resultsFolder with file with Current Time Result');
                    log(
                        '#############################################################################################',
                    );
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
                                const filesByDate = fileObject.filter((f) => f.url.includes(sitecheckerResult.url))[0]
                                    .filesByDate;
                                filesByDate.push({
                                    date: new Date(),
                                    files: [fileToSave],
                                });
                            } else {
                                const filesByDate = fileObject.filter((f) => f.url.includes(sitecheckerResult.url))[0]
                                    .filesByDate;
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
                    defineExtraTags(sitecheckerResult, config);
                    fs.writeFileSync(fileToSave, JSON.stringify(siteResult, null, 4));
                    fs.writeFileSync(config.resultsPath + 'files.json', JSON.stringify(fileObject, null, 4));

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
                    await fs.promises.writeFile(
                        inapplicablesPath,
                        JSON.stringify(sitecheckerResult.inapplicable, null, 4),
                    );

                    const filesJson: AnalyzedSite[] = JSON.parse(
                        fs.readFileSync(config.resultsPath + 'files.json').toString(),
                    );
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
                if (sitecheckerResult.violations.length >= config.threshold) {
                    retCode = 2;
                }
            }
        } catch (e) {
            if (e.message.includes('Threshold not met')) {
                retCode = 2;
            } else if (e.message.includes('ERR_NAME_NOT_RESOLVED')) {
                retCode = 3;
            } else {
                retCode = 1;
            }

            error(e);
        }

        process.exit(retCode);
    }
})();
