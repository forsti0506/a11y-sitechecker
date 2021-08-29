// import { Page } from 'puppeteer';

// const promisees: Promise<Request>[] = [];
// const pendingRequests = new Set();
// export function initPendingRequest(page: Page, resourceType?: string[]): void {
//     page.setRequestInterception(true);
//     const finishedRequestsWithSuccess = new Set();
//     const finishedRequestsWithErrors = new Set();
//     page.on('request', (request) => {
//         request.continue();
//         if (!resourceType || resourceType.includes(request.resourceType())) {
//             pendingRequests.add(request);
//             promisees.push(
//                 new Promise((resolve) => {
//                     request['resolver'] = resolve;
//                 }),
//             );
//         }
//     });
//     page.on('requestfailed', (request) => {
//         if (!resourceType || resourceType.includes(request.resourceType())) {
//             pendingRequests.delete(request);
//             finishedRequestsWithErrors.add(request);
//             if (request['resolver']) {
//                 request['resolver']();
//                 delete request['resolver'];
//             }
//         }
//     });
//     page.on('requestfinished', (request) => {
//         if (!resourceType || resourceType.includes(request.resourceType())) {
//             pendingRequests.delete(request);
//             finishedRequestsWithSuccess.add(request);
//             if (request['resolver']) {
//                 request['resolver']();
//                 delete request['resolver'];
//             }
//         }
//     });
// }

// export async function waitForAllRequests(): Promise<void> {
//     if (pendingRequestCount() === 0) {
//         return;
//     }
//     await Promise.all(promisees);
// }

// function pendingRequestCount(): number {
//     return pendingRequests.size;
// }
