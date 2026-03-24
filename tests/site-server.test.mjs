import assert from 'node:assert/strict';

import { startPersonalWebsiteServer } from '../scripts/personal-website-dev.mjs';

async function main() {
  const { server, url } = await startPersonalWebsiteServer({
    rootDir: process.cwd(),
    port: 0
  });

  try {
    const pageResponse = await fetch(url);
    assert.equal(pageResponse.status, 200);
    const pageHtml = await pageResponse.text();
    assert.match(pageHtml, /MAS 项目总览/u);
    assert.match(pageHtml, /项目整体运转总览/u);
    assert.match(pageHtml, /状态机/u);
    assert.match(pageHtml, /御史台/u);

    const overviewResponse = await fetch(`${url}/api/overview`);
    assert.equal(overviewResponse.status, 200);
    const overview = await overviewResponse.json();
    assert.equal(Array.isArray(overview.board), true);
    assert.equal(overview.spotlight.task_id, 'personal-website');
    assert.equal(typeof overview.intent.stage_goal, 'string');

    const boardResponse = await fetch(`${url}/api/tasks/personal-website/board`);
    assert.equal(boardResponse.status, 200);
    const board = await boardResponse.json();
    assert.equal(board.task_id, 'personal-website');
    assert.equal(typeof board.latest_event, 'string');

    console.log('PASS personal website server serves the frontend and runtime APIs');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

try {
  await main();
  console.log('All 1 site server tests passed.');
} catch (error) {
  console.error('FAIL personal website server serves the frontend and runtime APIs');
  console.error(error);
  process.exitCode = 1;
}
