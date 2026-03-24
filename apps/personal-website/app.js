const departmentMatrix = [
  {
    key: 'zhongshu',
    title: '中书',
    duty: '需求转规格',
    scope: '00-intake/, 01-spec/',
    summary: '负责把皇帝需求转成可执行规格、验收标准和非目标。'
  },
  {
    key: 'menxia',
    title: '门下',
    duty: '只做评审',
    scope: '02-review/',
    summary: '只输出通过或驳回结论，不直接代写生产交付物。'
  },
  {
    key: 'shangshu',
    title: '尚书',
    duty: '唯一总控',
    scope: 'state / runtime / 路由裁决',
    summary: '决定下一阶段、是否冻结、是否回退、是否等待人工。'
  },
  {
    key: 'libu_task_breakdown',
    title: '吏部',
    duty: '任务拆分',
    scope: '03-plan/',
    summary: '拆工作流、列依赖、明责任，把项目从规格变成任务结构。'
  },
  {
    key: 'libu_prototype',
    title: '礼部',
    duty: '原型与结构',
    scope: '04-design/prototype.md',
    summary: '先定义页面结构和交互形态，再让后续设计与实现继续。'
  },
  {
    key: 'gongbu',
    title: '工部',
    duty: '设计与构建',
    scope: '04-design/, 07-build/',
    summary: '产出 API、数据模型、迁移方案和真实构建交付物。'
  },
  {
    key: 'xingbu',
    title: '刑部',
    duty: '规则与验证',
    scope: '05-rules/, 06-tests/, 08-verify/',
    summary: '定义规则、测试用例和验证结果，负责把质量门禁做实。'
  },
  {
    key: 'yushitai',
    title: '御史台',
    duty: '独立审计',
    scope: '09-audit/',
    summary: '独立检查治理偏差和执行偏差，并给出回退建议。'
  }
];

const truthSourceMatrix = [
  {
    file: 'manifest.json',
    role: '制度定义',
    summary: '定义 departments、artifacts、routing_policy、human_approvals_required 和全局 constraints。'
  },
  {
    file: 'state.json',
    role: '阶段状态',
    summary: '记录 current_state、owner、active_agents、allowed_write_paths、approved_artifacts 等运行时核心状态。'
  },
  {
    file: 'runtime/control.json',
    role: '执行控制',
    summary: '保存租约、暂停、阻塞、重试策略和待处理人工动作。'
  },
  {
    file: 'runtime/events.jsonl',
    role: '事件轨迹',
    summary: '保存 TASK_ENQUEUED、STATE_TRANSITIONED、REVIEW_DECISION_CHANGED 等机器可读事件流。'
  },
  {
    file: '02-review/*.md / 09-audit/*.md',
    role: '人类可读证据',
    summary: '评审结论、审计结论、发现和回退建议都保存在这些文档里。'
  },
  {
    file: 'scripts/*.mjs',
    role: '调度与门禁',
    summary: '状态推进、门禁校验、运行时驱动、看板与验证命令都由脚本层提供。'
  }
];

const workflowStates = [
  { state: 'INTAKE', label: '需求入队', kind: 'work' },
  { state: 'SPEC_DRAFT', label: '规格起草', kind: 'work' },
  { state: 'REQUIREMENT_REVIEW', label: '需求评审', kind: 'gate' },
  { state: 'TASK_PLANNED', label: '任务规划', kind: 'work' },
  { state: 'PROTOTYPE_DRAFT', label: '原型设计', kind: 'work' },
  { state: 'UI_REVIEW', label: 'UI 评审', kind: 'gate' },
  { state: 'API_DESIGNED', label: 'API 设计', kind: 'work' },
  { state: 'API_REVIEW', label: 'API 评审', kind: 'gate' },
  { state: 'RULES_FROZEN', label: '规则冻结', kind: 'work' },
  { state: 'TESTS_DRAFTED', label: '测试设计', kind: 'work' },
  { state: 'TEST_REVIEW', label: '测试评审', kind: 'gate' },
  { state: 'BUILD_IN_PROGRESS', label: '构建交付', kind: 'work' },
  { state: 'INTEGRATION_VERIFY', label: '集成验证', kind: 'work' },
  { state: 'AUDIT_REVIEW', label: '审计复核', kind: 'gate' },
  { state: 'DONE', label: '完成归档', kind: 'done' }
];

const commandMatrix = [
  {
    label: '仓库校验',
    command: 'node scripts\\task-docs.mjs validate',
    summary: '检查所有任务工作区、真相源文件、门禁文档和运行时契约是否仍然一致。'
  },
  {
    label: '运行时看板',
    command: 'node scripts\\mas-runtime.mjs board --json',
    summary: '查看当前所有任务的状态、阻塞、部门、最新事件和评审快照。'
  },
  {
    label: '执行意图',
    command: 'node scripts\\mas-runtime-intent.mjs --task-id personal-website --markdown',
    summary: '看当前任务在当前阶段的机器可读 handoff 契约。'
  },
  {
    label: '自动推进',
    command: 'node scripts\\mas-runtime.mjs run-loop --task-id <task-id> --driver module --driver-module "<module>"',
    summary: '用运行时调度器持续推进单个任务，验证机制和驱动接缝。'
  }
];

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${url}`);
  }
  return response.json();
}

function createElement(tag, className, html) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (html) {
    element.innerHTML = html;
  }
  return element;
}

function statusClass(status) {
  return `pill status-${String(status ?? 'queued').toLowerCase()}`;
}

function renderDepartmentMatrix() {
  const host = document.querySelector('#department-grid');
  host.innerHTML = '';
  for (const item of departmentMatrix) {
    host.append(
      createElement(
        'article',
        'department-card',
        `
          <p class="card-meta">${item.title}</p>
          <h3>${item.duty}</h3>
          <p>${item.summary}</p>
          <p><strong>主要写入：</strong>${item.scope}</p>
        `
      )
    );
  }
}

function renderTruthSources() {
  const host = document.querySelector('#truth-grid');
  host.innerHTML = '';
  for (const source of truthSourceMatrix) {
    host.append(
      createElement(
        'article',
        'truth-card',
        `
          <p class="card-meta">${source.role}</p>
          <h3>${source.file}</h3>
          <p>${source.summary}</p>
        `
      )
    );
  }
}

function renderStateMachine(currentState) {
  const host = document.querySelector('#state-machine-grid');
  host.innerHTML = '';
  for (const item of workflowStates) {
    const active = item.state === currentState ? 'is-active' : '';
    const gate = item.kind === 'gate' ? 'is-gate' : '';
    const done = item.kind === 'done' ? 'is-done' : '';
    host.append(
      createElement(
        'article',
        `state-card ${active} ${gate} ${done}`.trim(),
        `
          <p class="card-meta">${item.state}</p>
          <h3>${item.label}</h3>
          <p>${item.kind === 'gate' ? '门禁节点' : item.kind === 'done' ? '终态节点' : '生产节点'}</p>
        `
      )
    );
  }
}

function renderCommands() {
  const host = document.querySelector('#command-grid');
  host.innerHTML = '';
  for (const item of commandMatrix) {
    host.append(
      createElement(
        'article',
        'command-card',
        `
          <p class="card-meta">${item.label}</p>
          <code>${item.command}</code>
          <p>${item.summary}</p>
        `
      )
    );
  }
}

function renderSpotlight(task) {
  const host = document.querySelector('#runtime-spotlight');
  host.innerHTML = `
    <div class="runtime-spotlight-head">
      <div>
        <p class="card-meta">聚焦任务</p>
        <h3>${task.title}</h3>
      </div>
      <span class="${statusClass(task.status)}">${task.status}</span>
    </div>
    <p class="runtime-spotlight-copy">${task.stage_goal}</p>
    <div class="runtime-spotlight-meta">
      <span class="pill">${task.current_state}</span>
      <span class="pill">${task.current_department}</span>
      <span class="pill">${task.next_action}</span>
    </div>
    <div class="runtime-spotlight-grid">
      <div>
        <span class="spotlight-label">最近事件</span>
        <strong>${task.latest_event ?? '暂无事件'}</strong>
      </div>
      <div>
        <span class="spotlight-label">审计结论</span>
        <strong>${task.latest_audit_decision ?? '待定'}</strong>
      </div>
      <div>
        <span class="spotlight-label">负责人</span>
        <strong>${task.owner}</strong>
      </div>
    </div>
  `;
}

function renderBoard(board, spotlightTaskId) {
  const host = document.querySelector('#task-board');
  host.innerHTML = '';
  const secondaryTasks = board.filter(item => item.task_id !== spotlightTaskId);

  for (const task of secondaryTasks) {
    const reviewSummary = Object.entries(task.latest_review_decisions ?? {})
      .map(([state, decision]) => `${state}: ${decision}`)
      .join(' · ');

    host.append(
      createElement(
        'article',
        'board-card',
        `
          <p class="card-meta">仓库任务 · ${task.current_department}</p>
          <h3>${task.title}</h3>
          <p>${task.stage_goal}</p>
          <div class="board-meta">
            <span class="${statusClass(task.status)}">${task.status}</span>
            <span class="pill">${task.current_state}</span>
          </div>
          <p><strong>下一步：</strong>${task.next_action}</p>
          <p><strong>评审快照：</strong>${reviewSummary || '尚未进入评审阶段'}</p>
        `
      )
    );
  }
}

function renderEvents(events) {
  const host = document.querySelector('#event-stream');
  host.innerHTML = '';
  for (const event of events) {
    host.append(
      createElement(
        'article',
        'timeline-item',
        `
          <p class="timeline-meta">${event.type} · ${new Date(event.ts).toLocaleString('zh-CN')}</p>
          <strong>${event.summary}</strong>
          <span>${event.actor?.id ?? 'system'}</span>
        `
      )
    );
  }
}

function fillHero(overview) {
  const spotlight = overview.spotlight;
  const completed = overview.board.filter(item => item.status === 'completed').length;
  const queued = overview.board.filter(item => item.status === 'queued').length;

  document.querySelector('#spotlight-title').textContent = spotlight.title;
  document.querySelector('#spotlight-goal').textContent = overview.intent.goal;
  document.querySelector('#metric-total').textContent = String(overview.board.length);
  document.querySelector('#metric-completed').textContent = String(completed);
  document.querySelector('#metric-queued').textContent = String(queued);
  document.querySelector('#metric-state').textContent = spotlight.current_state;
  document.querySelector('#intent-summary').textContent = overview.intent.stage_goal;

  const humanActions = document.querySelector('#human-actions');
  humanActions.innerHTML = '';
  const actions = overview.intent.human_actions.length > 0 ? overview.intent.human_actions : ['当前无需人工动作'];
  for (const action of actions) {
    humanActions.append(createElement('span', 'chip', action));
  }
}

async function bootstrap() {
  renderTruthSources();
  renderDepartmentMatrix();
  renderCommands();

  try {
    const overview = await readJson('/api/overview');
    fillHero(overview);
    renderStateMachine(overview.spotlight.current_state);
    renderSpotlight(overview.spotlight);
    renderBoard(overview.board, overview.spotlight.task_id);
    renderEvents(overview.events);
  } catch (error) {
    document.querySelector('#runtime-spotlight').innerHTML = `<h3>加载失败</h3><p>${error.message}</p>`;
    document.querySelector('#task-board').innerHTML = `<article class="board-card"><h3>加载失败</h3><p>${error.message}</p></article>`;
    document.querySelector('#event-stream').innerHTML = `<article class="timeline-item"><strong>无法读取运行时数据</strong><span>${error.message}</span></article>`;
  }
}

bootstrap();
