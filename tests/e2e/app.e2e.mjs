import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:8011";

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "playwright",
    process.env.PLAYWRIGHT_NODE_MODULES
      ? `${process.env.PLAYWRIGHT_NODE_MODULES}/playwright`
      : "",
    "/Users/blee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (_error) {
      // Try the next known location.
    }
  }

  throw new Error(
    "Playwright is required for e2e tests. Install it locally or set PLAYWRIGHT_MODULE/PLAYWRIGHT_NODE_MODULES."
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function dashboardTest(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-dashboard", { timeout: 10_000 });

  const cards = page.locator(".aikb-notebook-card");
  const count = await cards.count();
  assert(count >= 16, `Expected at least 16 dashboard cards, found ${count}.`);

  const titles = await page
    .locator(".aikb-notebook-card strong")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent.trim()));
  for (const title of ["OpenAI Agents SDK", "LangGraph", "Tutorials", "Weekly Updates"]) {
    assert(titles.includes(title), `Missing dashboard card: ${title}`);
  }

  const offsets = await cards.evaluateAll((nodes) =>
    nodes.slice(0, 8).map((card) => {
      const root = card.getBoundingClientRect();
      return {
        title: Math.round(card.querySelector("strong").getBoundingClientRect().top - root.top),
        summary: Math.round(card.querySelector("p").getBoundingClientRect().top - root.top),
        meta: Math.round(card.querySelector("small").getBoundingClientRect().top - root.top),
      };
    })
  );
  assert(
    offsets.every(
      (offset) =>
        offset.title === offsets[0].title &&
        offset.summary === offsets[0].summary &&
        offset.meta === offsets[0].meta
    ),
    `Dashboard card text is not aligned: ${JSON.stringify(offsets)}`
  );
}

async function workspaceTest(page) {
  await page.goto(`${baseUrl}/agents/openai-agents-sdk/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-workspace", { timeout: 10_000 });

  await expectVisible(page, ".aikb-sources-pane", "sources panel");
  await expectVisible(page, ".aikb-reader-pane", "reader panel");
  await expectVisible(page, ".aikb-studio-pane", "studio panel");

  const toolCount = await page.locator(".aikb-study-tool").count();
  assert(toolCount === 6, `Expected 6 study tools, found ${toolCount}.`);

  const localSourceRows = await page
    .locator(".aikb-source-item")
    .evaluateAll((nodes) =>
      nodes.filter((node) => `${node.textContent} ${node.getAttribute("href")}`.includes("127.0.0.1"))
    );
  assert(localSourceRows.length === 0, "Source panel should not list localhost source rows.");

  const firstSource = page.locator(".aikb-source-item").first();
  const sourceHref = await firstSource.getAttribute("href");
  await firstSource.click();
  await page.waitForSelector(".aikb-source-preview", { timeout: 10_000 });
  assert(
    page.url() === `${baseUrl}/agents/openai-agents-sdk/`,
    `Expected source preview to keep current app route, got ${page.url()}.`
  );
  const previewHref = await page.locator(".aikb-source-preview__bar a").getAttribute("href");
  assert(previewHref === sourceHref, `Expected preview source link ${sourceHref}, got ${previewHref}.`);
  const iframeCount = await page.locator(".aikb-source-preview iframe").count();
  assert(iframeCount === 0, "Source preview should not iframe external documentation pages.");
  await page.locator("[data-source-back]").click();
  await page.waitForSelector(".aikb-reader h1", { timeout: 10_000 });

  await page.locator("[data-tool='quiz']").click();
  await page.waitForSelector(".aikb-quiz__question", { timeout: 10_000 });
  const outputTitle = await page.locator(".aikb-study-output__header h2").textContent();
  assert(outputTitle.trim() === "Quiz", `Expected Quiz output, found ${outputTitle}.`);
  const initialProgress = await page.locator(".aikb-quiz__progress > span").first().textContent();
  assert(initialProgress.trim().startsWith("1 / "), `Unexpected quiz progress: ${initialProgress}`);
  const quizOptions = page.locator(".aikb-quiz__option");
  assert((await quizOptions.count()) === 4, "Expected four answer choices.");
  const nextButton = page.locator("[data-quiz-next]");
  assert(await nextButton.isDisabled(), "Expected Next to remain disabled until an answer is selected.");
  await quizOptions.nth(1).click();
  assert(!(await nextButton.isDisabled()), "Expected answer selection to enable Next.");
  await nextButton.click();
  const nextProgress = await page.locator(".aikb-quiz__progress > span").first().textContent();
  assert(nextProgress.trim().startsWith("2 / "), `Expected quiz to advance, got ${nextProgress}`);
  await page.locator("[data-study-back]").click();

  await page.locator("[data-tool='mindmap']").click();
  await page.waitForSelector(".aikb-mindmap-artifact", { timeout: 10_000 });
  const storedMap = await page.evaluate(() => {
    const maps = JSON.parse(window.localStorage.getItem("aikb.mindmaps.v1") || "{}");
    return maps[window.location.pathname];
  });
  assert(storedMap?.root?.children?.length > 0, "Expected generated mind map in localStorage.");
  assert(
    storedMap.root.children.some((node) => node.type === "sources" && node.children.length > 0),
    "Expected mind map to include cited sources."
  );
  const connectorPath = await page.locator(".aikb-map-connector").first().getAttribute("d");
  assert(connectorPath.includes(" C "), "Expected curved Bézier mind-map connectors.");

  const viewport = page.locator(".aikb-map-viewport");
  await viewport.focus();
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  const scrollBefore = await viewport.evaluate((node) => node.scrollTop);
  await page.keyboard.press("ArrowDown");
  const scrollAfter = await viewport.evaluate((node) => node.scrollTop);
  assert(scrollAfter > scrollBefore, "Expected arrow keys to pan the mind-map canvas.");

  const nodesBeforeExpansion = await page.locator("[data-map-node]").count();
  const topicNode = page.locator("[data-map-node][data-has-children='true']").nth(1);
  await topicNode.click();
  const nodesAfterExpansion = await page.locator("[data-map-node]").count();
  assert(nodesAfterExpansion > nodesBeforeExpansion, "Expected topic click to expand child nodes.");

  const knowledgeNode = page
    .locator("[data-map-node][data-has-children='false'][data-target-id]:not([data-target-id=''])")
    .first();
  await knowledgeNode.click();
  await page.waitForSelector(".aikb-study-panel__output--map", { state: "hidden" });
  await page.waitForSelector(".aikb-knowledge-focus", { timeout: 2_000 });
}

async function cachedSourcePreviewTest(page) {
  await page.goto(`${baseUrl}/agents/langgraph/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-workspace", { timeout: 10_000 });

  await page.locator(".aikb-source-item").first().click();
  await page.waitForSelector(".aikb-source-preview", { timeout: 10_000 });
  await page.waitForFunction(() => {
    const status = document.querySelector(".aikb-source-preview__status");
    return status && status.textContent.includes("readable preview");
  });
  const previewItems = await page.locator(".aikb-source-preview__content p, .aikb-source-preview__content h1, .aikb-source-preview__content h2, .aikb-source-preview__content h3").count();
  assert(previewItems > 0, "Expected cached source preview content to render.");
  const fallbackVisible = await page.locator(".aikb-source-preview__blocked").count();
  assert(fallbackVisible === 0, "Expected cached source preview instead of unavailable fallback.");
}

async function quizLifecycleTest(page) {
  await page.goto(`${baseUrl}/production/evaluation/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-workspace", { timeout: 10_000 });
  await page.locator("[data-tool='quiz']").click();
  await page.waitForSelector(".aikb-quiz__question", { timeout: 10_000 });

  const hint = page.locator(".aikb-quiz__hint");
  assert(!(await hint.getAttribute("open")), "Expected quiz hint to start collapsed.");
  await hint.locator("summary").click();
  assert((await hint.getAttribute("open")) !== null, "Expected Hint to reveal contextual guidance.");
  const hintText = await hint.locator("p").textContent();
  assert(hintText.trim().length > 20, "Expected a meaningful quiz hint.");

  const firstRadio = page.locator("input[name='quiz-answer']").first();
  await firstRadio.focus();
  await page.keyboard.press("Space");
  assert(await firstRadio.isChecked(), "Expected Space to select a focused quiz answer.");
  assert(
    await page.locator(".aikb-quiz__option.is-selected").isVisible(),
    "Expected selected answer styling."
  );

  const progressText = await page.locator(".aikb-quiz__progress > span").first().textContent();
  const total = Number(progressText.split("/")[1].trim());
  assert(total >= 2, `Expected a multi-question quiz, found ${total}.`);
  for (let question = 0; question < total; question += 1) {
    if (!(await page.locator("input[name='quiz-answer']:checked").count())) {
      await page.locator(".aikb-quiz__option").first().click();
    }
    await page.locator("[data-quiz-next]").click();
  }

  await page.waitForSelector(".aikb-quiz__results", { timeout: 5_000 });
  const result = await page.locator(".aikb-quiz__results strong").textContent();
  assert(result.trim().endsWith(`/ ${total}`), `Unexpected quiz result: ${result}`);
  await page.locator("[data-quiz-restart]").click();
  const restartedProgress = await page.locator(".aikb-quiz__progress > span").first().textContent();
  assert(restartedProgress.trim() === `1 / ${total}`, "Expected Try again to restart the quiz.");
  assert(
    await page.locator("[data-quiz-next]").isDisabled(),
    "Expected restarted quiz to require a new answer."
  );
}

async function mindMapPersistenceAndNavigationTest(page) {
  await page.goto(`${baseUrl}/agents/framework-comparison/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.removeItem("aikb.mindmaps.v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-workspace", { timeout: 10_000 });
  await page.locator("[data-tool='mindmap']").click();
  await page.waitForSelector(".aikb-mindmap-artifact", { timeout: 10_000 });

  const generatedLabel = await page.locator(".aikb-map-toolbar span").first().textContent();
  await page.locator("[data-study-back]").click();
  await page.locator("[data-tool='mindmap']").click();
  await page.waitForSelector(".aikb-mindmap-artifact", { timeout: 5_000 });
  const reopenedLabel = await page.locator(".aikb-map-toolbar span").first().textContent();
  assert(reopenedLabel === generatedLabel, "Expected reopening Mind Map to reuse the cached artifact.");

  const expandable = page.locator("[data-map-node][data-has-children='true']").nth(1);
  const collapsedCount = await page.locator("[data-map-node]").count();
  await expandable.click();
  const expandedCount = await page.locator("[data-map-node]").count();
  assert(expandedCount > collapsedCount, "Expected parent node to reveal its children.");
  const expandedState = await expandable.getAttribute("aria-expanded");
  assert(expandedState === "true", "Expected expanded node to expose its state accessibly.");
  await expandable.click();
  assert(
    (await page.locator("[data-map-node]").count()) === collapsedCount,
    "Expected second parent click to collapse its children."
  );

  await page.locator("[data-map-zoom-in]").click();
  const zoomedLabel = await page.locator("[data-map-zoom]").textContent();
  assert(zoomedLabel.trim() === "110%", `Expected zoom control to reach 110%, got ${zoomedLabel}.`);
  await page.locator("[data-map-fit]").click();
  const fittedZoom = Number((await page.locator("[data-map-zoom]").textContent()).replace("%", ""));
  assert(fittedZoom <= 100, `Expected Fit to keep the diagram within the viewport, got ${fittedZoom}%.`);

  const sourcesNode = page.locator("[data-map-node][data-node-id='sources']");
  assert(await sourcesNode.isVisible(), "Expected a Sources branch in the mind map.");
  await sourcesNode.click();
  const sourceNodes = page.locator(".aikb-map-node--source[data-has-children='false']");
  assert((await sourceNodes.count()) > 0, "Expected cited source leaves after expanding Sources.");
  await sourceNodes.first().click();
  await page.waitForSelector(".aikb-source-preview", { timeout: 10_000 });
  assert(
    (await page.locator(".aikb-source-preview__bar a").getAttribute("href")).startsWith("http"),
    "Expected a source leaf to open its source in Reading."
  );
}

async function groundedLearningChatTest(page) {
  let chatPayload;
  await page.route("http://127.0.0.1:11434/api/chat", async (route) => {
    chatPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body:
        '{"message":{"role":"assistant","content":"Architecture explains the main components. "},"done":false}\n' +
        '{"message":{"role":"assistant","content":"Use the Architecture section to inspect their relationships."},"done":true}\n',
    });
  });
  await page.goto(`${baseUrl}/agents/openai-agents-sdk/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.removeItem("aikb.chat.v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-workspace", { timeout: 10_000 });

  await page.locator("[data-tool='chat']").click();
  await page.waitForSelector(".aikb-chat-panel[data-open='true']");
  assert(
    (await page.locator("[name='chat-model']").inputValue()) === "gemma3:1b",
    "Expected the free local model default."
  );
  assert(
    (await page.locator("[data-chat-prompt]").count()) === 3,
    "Expected learning-oriented starter prompts."
  );

  await page.locator("[name='chat-question']").fill("How is the SDK architecture organized?");
  await page.locator(".aikb-chat__form button[type='submit']").click();
  await page.waitForFunction(() => {
    const status = document.querySelector(".aikb-chat__status");
    return status?.textContent.includes("grounded in this page");
  });
  assert(chatPayload?.model === "gemma3:1b", "Expected configured Ollama model in request.");
  assert(chatPayload?.stream === true, "Expected streaming Ollama chat request.");
  assert(
    chatPayload.messages[0].role === "system" &&
      chatPayload.messages[0].content.includes("PAGE CONTEXT") &&
      chatPayload.messages[0].content.includes("Architecture"),
    "Expected a grounded system prompt with retrieved page context."
  );
  const assistantText = await page.locator(".aikb-chat__message--assistant p").textContent();
  assert(assistantText.includes("main components"), "Expected streamed assistant response.");
  const history = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("aikb.chat.v1"));
    return state.history[window.location.pathname];
  });
  assert(history.length === 2, `Expected persisted user and assistant messages, found ${history.length}.`);

  const sectionLink = page.locator("[data-chat-section='Architecture']");
  assert((await sectionLink.count()) === 1, "Expected answer-linked Reading navigation.");
  await sectionLink.click();
  await page.waitForSelector(".aikb-reader h2.aikb-knowledge-focus", { timeout: 2_000 });

  await page.locator("[data-chat-close]").click();
  assert(
    !(await page.locator(".aikb-chat-panel").isVisible()),
    "Expected the Learning Chat panel to close."
  );
  await page.unroute("http://127.0.0.1:11434/api/chat");
}

async function tutorialRouteTest(page) {
  await page.goto(`${baseUrl}/tutorials/agent-tool-calling/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".aikb-workspace", { timeout: 10_000 });

  const title = await page.locator(".aikb-app-title").textContent();
  assert(title.trim() === "Agent Tool Calling", `Unexpected tutorial title: ${title}`);
  await expectVisible(page, "[data-notes-open]", "top notes button");

  await page.locator("[data-tool='flashcards']").click();
  await page.waitForSelector(".aikb-study-card", { timeout: 10_000 });
  const firstCard = page.locator(".aikb-study-card").first();
  const pressedBefore = await firstCard.getAttribute("aria-pressed");
  assert(pressedBefore === "false", `Expected flashcard to start unflipped, got ${pressedBefore}.`);
  await firstCard.click();
  const pressedAfter = await firstCard.getAttribute("aria-pressed");
  assert(pressedAfter === "true", `Expected flashcard to flip on click, got ${pressedAfter}.`);

  await firstCard.locator("[data-card-menu]").click();
  await firstCard.locator("[data-card-add-note]").click();
  await page.waitForSelector(".aikb-note-item", { timeout: 10_000 });
  const menuVisibleAfterSave = await firstCard.locator(".aikb-card-menu__items").isVisible();
  assert(!menuVisibleAfterSave, "Expected flashcard menu to close after adding a note.");
  const savedNoteTitle = await page.locator(".aikb-note-item strong").first().textContent();
  assert(savedNoteTitle.trim().length > 0, "Expected added flashcard note to have a title.");
  const categoryTitle = await page.locator(".aikb-note-category h3").first().textContent();
  assert(categoryTitle.trim() === "Agent Tool Calling", `Unexpected note category: ${categoryTitle}`);

  await firstCard.locator("[data-card-menu]").click();
  const addButtonDisabled = await firstCard.locator("[data-card-add-note]").isDisabled();
  assert(addButtonDisabled, "Expected saved flashcard note action to be disabled.");
  const noteCount = await page.evaluate(() => JSON.parse(window.localStorage.getItem("aikb.notes.v1")).length);
  assert(noteCount === 1, `Expected duplicate note prevention to keep 1 note, found ${noteCount}.`);
}

async function expectVisible(page, selector, label) {
  const visible = await page.locator(selector).first().isVisible();
  assert(visible, `Expected ${label} to be visible.`);
}

async function main() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await dashboardTest(page);
    await workspaceTest(page);
    await cachedSourcePreviewTest(page);
    await quizLifecycleTest(page);
    await mindMapPersistenceAndNavigationTest(page);
    await groundedLearningChatTest(page);
    await tutorialRouteTest(page);
    console.log("E2E tests passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
