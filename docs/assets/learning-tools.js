(function () {
  "use strict";

  var MAX_ITEMS = 8;

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }
    callback();
  }

  function article() {
    return document.querySelector(".md-content__inner");
  }

  function pageTitle(root) {
    var heading = root.querySelector("h1");
    var title = heading ? heading.textContent : document.title.replace(" - AI Engineering Intelligence", "");
    return clean(title.replace("¶", ""));
  }

  function clean(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function sentences(root) {
    var ignored = ".aikb-study-panel, nav, code, pre, table";
    var blocks = Array.prototype.slice.call(root.querySelectorAll("p, li"));
    var text = blocks
      .filter(function (node) {
        return !node.closest(ignored);
      })
      .map(function (node) {
        return clean(node.textContent);
      })
      .filter(function (value) {
        return value.length > 60;
      })
      .join(" ");

    return text
      .split(/(?<=[.!?])\s+/)
      .map(clean)
      .filter(function (value) {
        return value.length > 45 && value.length < 320;
      })
      .slice(0, 30);
  }

  function headings(root) {
    return Array.prototype.slice.call(root.querySelectorAll("h2, h3"))
      .filter(function (node) {
        return !node.closest(".aikb-study-panel");
      })
      .map(function (node) {
        return {
          level: node.tagName.toLowerCase(),
          text: clean(node.textContent.replace("#", "")),
        };
      })
      .filter(function (item) {
        return item.text.length > 0;
      });
  }

  function keywords(root) {
    var words = clean(root.textContent)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(function (word) {
        return word.length > 4 && !COMMON_WORDS[word];
      });

    var counts = {};
    words.forEach(function (word) {
      counts[word] = (counts[word] || 0) + 1;
    });

    return Object.keys(counts)
      .sort(function (a, b) {
        return counts[b] - counts[a];
      })
      .slice(0, 12);
  }

  function sectionText(root, headingText) {
    var match = Array.prototype.slice.call(root.querySelectorAll("h2, h3")).find(function (node) {
      return clean(node.textContent.replace("#", "")) === headingText;
    });
    if (!match) {
      return "";
    }

    var parts = [];
    var node = match.nextElementSibling;
    while (node && !/^H[23]$/.test(node.tagName)) {
      if (!node.closest(".aikb-study-panel")) {
        parts.push(clean(node.textContent));
      }
      node = node.nextElementSibling;
    }
    return clean(parts.join(" "));
  }

  function clear(output) {
    output.innerHTML = "";
    output.dataset.open = "true";
  }

  function header(output, title) {
    var wrapper = document.createElement("div");
    wrapper.className = "aikb-study-output__header";
    wrapper.innerHTML =
      "<div>" +
      "<div class=\"aikb-study-route\">Study tools / " +
      escapeHtml(title) +
      "</div>" +
      "<h2>" +
      escapeHtml(title) +
      "</h2>" +
      "</div>";

    var actions = document.createElement("div");
    actions.className = "aikb-study-output__actions";

    var back = document.createElement("button");
    back.className = "aikb-study-button aikb-study-button--quiet";
    back.type = "button";
    back.textContent = "Back to tools";
    back.setAttribute("data-study-back", "true");

    var close = document.createElement("button");
    close.className = "aikb-study-button aikb-study-button--quiet";
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", function () {
      output.dataset.open = "false";
      stopAudio();
    });

    actions.appendChild(back);
    actions.appendChild(close);
    wrapper.appendChild(actions);
    output.appendChild(wrapper);
  }

  function renderEmpty(output) {
    var empty = document.createElement("p");
    empty.className = "aikb-study-empty";
    empty.textContent = "This page does not have enough structured content to generate this study artifact yet.";
    output.appendChild(empty);
  }

  function renderQuiz(root, output) {
    clear(output);
    header(output, "Quiz");

    var facts = sentences(root).slice(0, MAX_ITEMS);
    var terms = keywords(root);
    if (facts.length === 0) {
      renderEmpty(output);
      return;
    }

    facts.forEach(function (fact, index) {
      var key = terms[index % Math.max(terms.length, 1)] || "this topic";
      var distractors = terms
        .filter(function (term) {
          return term !== key;
        })
        .slice(0, 3);

      while (distractors.length < 3) {
        distractors.push(["workflow", "security", "evaluation"][distractors.length]);
      }

      var card = document.createElement("section");
      card.className = "aikb-study-question";
      card.innerHTML =
        "<h3>Question " +
        (index + 1) +
        "</h3>" +
        "<p>Which idea is most directly supported by this page?</p>" +
        "<ol>" +
        "<li>" +
        escapeHtml(fact) +
        "</li>" +
        distractors
          .map(function (term) {
            return "<li>A general note about " + escapeHtml(term) + ".</li>";
          })
          .join("") +
        "</ol>" +
        "<details class=\"aikb-study-answer\"><summary>Answer</summary><p>The first option is source-grounded in this page section.</p></details>";
      output.appendChild(card);
    });
  }

  function renderFlashcards(root, output) {
    clear(output);
    header(output, "Flashcards");

    var topicHeadings = headings(root).slice(0, MAX_ITEMS);
    if (topicHeadings.length === 0) {
      renderEmpty(output);
      return;
    }

    topicHeadings.forEach(function (heading) {
      var body = sectionText(root, heading.text);
      var answer = body || "Review this section in the source page.";
      var card = document.createElement("section");
      card.className = "aikb-study-card";
      card.innerHTML =
        "<div class=\"aikb-study-card__front\">What should you remember about " +
        escapeHtml(heading.text) +
        "?</div>" +
        "<div class=\"aikb-study-card__back\">" +
        escapeHtml(truncate(answer, 260)) +
        "</div>" +
        "<div class=\"aikb-study-meta\">Source section: " +
        escapeHtml(heading.text) +
        "</div>";
      output.appendChild(card);
    });
  }

  function renderAudio(root, output) {
    clear(output);
    header(output, "Audio Review");

    var title = pageTitle(root);
    var points = headings(root)
      .slice(0, 6)
      .map(function (heading) {
        return heading.text;
      });
    var facts = sentences(root).slice(0, 4);
    var script =
      "Audio review for " +
      title +
      ". " +
      (points.length ? "The main sections are " + points.join(", ") + ". " : "") +
      facts.join(" ");

    if (script.length < 80) {
      renderEmpty(output);
      return;
    }

    var controls = document.createElement("div");
    controls.className = "aikb-study-script";

    var play = document.createElement("button");
    play.className = "aikb-study-button";
    play.type = "button";
    play.textContent = "Play audio review";
    play.addEventListener("click", function () {
      speak(script);
    });

    var stop = document.createElement("button");
    stop.className = "aikb-study-button aikb-study-button--quiet";
    stop.type = "button";
    stop.textContent = "Stop";
    stop.addEventListener("click", stopAudio);

    var transcript = document.createElement("p");
    transcript.textContent = script;

    controls.appendChild(play);
    controls.appendChild(document.createTextNode(" "));
    controls.appendChild(stop);
    controls.appendChild(transcript);
    output.appendChild(controls);
  }

  function renderMindMap(root, output) {
    clear(output);
    header(output, "Mind Map");

    var title = pageTitle(root);
    var topicHeadings = headings(root).slice(0, 10);
    if (topicHeadings.length === 0) {
      renderEmpty(output);
      return;
    }

    var map = document.createElement("section");
    map.className = "aikb-study-map";
    var html = "<strong>" + escapeHtml(title) + "</strong><ul>";
    topicHeadings.forEach(function (heading) {
      html += "<li>" + escapeHtml(heading.text);
      var body = sectionText(root, heading.text);
      var related = keywordsFromText(body).slice(0, 3);
      if (related.length) {
        html += "<ul>" + related.map(function (term) {
          return "<li>" + escapeHtml(term) + "</li>";
        }).join("") + "</ul>";
      }
      html += "</li>";
    });
    html += "</ul>";
    map.innerHTML = html;
    output.appendChild(map);
  }

  function renderGuide(root, output) {
    clear(output);
    header(output, "Study Guide");

    var title = pageTitle(root);
    var topicHeadings = headings(root).slice(0, 7);
    var terms = keywords(root).slice(0, 8);

    var guide = document.createElement("section");
    guide.className = "aikb-study-guide";
    guide.innerHTML =
      "<h3>Learning objective</h3>" +
      "<p>Understand the main engineering decisions and tradeoffs in " +
      escapeHtml(title) +
      ".</p>" +
      "<h3>Review sequence</h3>" +
      "<ol>" +
      topicHeadings.map(function (heading) {
        return "<li>" + escapeHtml(heading.text) + "</li>";
      }).join("") +
      "</ol>" +
      "<h3>Key terms</h3>" +
      "<p>" +
      escapeHtml(terms.join(", ")) +
      "</p>" +
      "<h3>Self-check</h3>" +
      "<p>Explain the page's core architecture, name its main failure modes, and describe how you would evaluate it in production.</p>";
    output.appendChild(guide);
  }

  function keywordsFromText(text) {
    if (!text) {
      return [];
    }
    var counts = {};
    clean(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(function (word) {
        return word.length > 4 && !COMMON_WORDS[word];
      })
      .forEach(function (word) {
        counts[word] = (counts[word] || 0) + 1;
      });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    });
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      window.alert("This browser does not support speech synthesis.");
      return;
    }
    stopAudio();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function stopAudio() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function truncate(text, limit) {
    if (text.length <= limit) {
      return text;
    }
    return text.slice(0, limit - 1).trim() + ".";
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon(name) {
    var icons = {
      audio: "<path d=\"M11 5 6 9H3v6h3l5 4V5Z\"></path><path d=\"M15.5 8.5a5 5 0 0 1 0 7\"></path><path d=\"M18.5 5.5a9 9 0 0 1 0 13\"></path>",
      cards: "<rect x=\"3\" y=\"7\" width=\"13\" height=\"10\" rx=\"2\"></rect><path d=\"M7 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1\"></path>",
      doc: "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z\"></path><path d=\"M14 2v6h6\"></path>",
      guide: "<path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"></path><path d=\"M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z\"></path>",
      grid: "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"></rect><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"></rect>",
      map: "<circle cx=\"6\" cy=\"6\" r=\"2\"></circle><circle cx=\"18\" cy=\"6\" r=\"2\"></circle><circle cx=\"12\" cy=\"18\" r=\"2\"></circle><path d=\"m8 7 3 8\"></path><path d=\"m16 7-3 8\"></path><path d=\"M8 6h8\"></path>",
      menu: "<path d=\"M4 6h16\"></path><path d=\"M4 12h16\"></path><path d=\"M4 18h16\"></path>",
      quiz: "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M9.1 9a3 3 0 1 1 4.8 2.4c-.9.7-1.4 1.1-1.4 2.1\"></path><path d=\"M12 17h.01\"></path>",
      search: "<circle cx=\"11\" cy=\"11\" r=\"8\"></circle><path d=\"m21 21-4.3-4.3\"></path>",
      sliders: "<path d=\"M4 21v-7\"></path><path d=\"M4 10V3\"></path><path d=\"M12 21v-9\"></path><path d=\"M12 8V3\"></path><path d=\"M20 21v-5\"></path><path d=\"M20 12V3\"></path><path d=\"M2 14h4\"></path><path d=\"M10 8h4\"></path><path d=\"M18 16h4\"></path>",
    };
    return (
      "<svg class=\"aikb-study-icon\" aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" +
      icons[name] +
      "</svg>"
    );
  }

  function toolButton(tool, iconName, label) {
    return (
      "<button class=\"aikb-study-tool\" type=\"button\" data-tool=\"" +
      tool +
      "\" title=\"" +
      label +
      "\" aria-label=\"" +
      label +
      "\">" +
      icon(iconName) +
      "<span>" +
      label +
      "</span>" +
      "</button>"
    );
  }

  function topicCards() {
    return [
      {
        title: "OpenAI Agents SDK",
        href: "/agents/openai-agents-sdk/",
        meta: "Agent Engineering - 10 sections",
        accent: "blue",
        mark: "OA",
        summary: "Tools, handoffs, guardrails, sessions, tracing",
      },
      {
        title: "Responses API",
        href: "/agents/responses-api/",
        meta: "Platform - 12 sections",
        accent: "green",
        mark: "R",
        summary: "State, tools, structured output, streaming",
      },
      {
        title: "Model Context Protocol",
        href: "/mcp/",
        meta: "Integration - 11 sections",
        accent: "violet",
        mark: "MCP",
        summary: "Clients, servers, tools, resources, prompts",
      },
      {
        title: "Retrieval-Augmented Generation",
        href: "/production/rag/",
        meta: "Production AI - 9 sections",
        accent: "cyan",
        mark: "RAG",
        summary: "Chunking, retrieval, reranking, citations",
      },
      {
        title: "Evaluation",
        href: "/production/evaluation/",
        meta: "Production AI - 8 sections",
        accent: "rose",
        mark: "EV",
        summary: "Datasets, graders, metrics, release gates",
      },
      {
        title: "Observability",
        href: "/production/observability/",
        meta: "Production AI - 8 sections",
        accent: "slate",
        mark: "OBS",
        summary: "Traces, metrics, logs, cost, quality",
      },
      {
        title: "Security",
        href: "/production/security/",
        meta: "Production AI - 9 sections",
        accent: "amber",
        mark: "SEC",
        summary: "Threat models, injection, tools, data protection",
      },
      {
        title: "AI Skills",
        href: "/coding/ai-skills/",
        meta: "AI Coding - 10 sections",
        accent: "lime",
        mark: "SK",
        summary: "Reusable workflows and agent capability packages",
      },
    ];
  }

  function isHomePage() {
    return location.pathname === "/" || /\/index\.html$/.test(location.pathname);
  }

  function buildDashboard() {
    var root = article();
    if (!root || root.querySelector(".aikb-dashboard")) {
      return;
    }

    document.body.classList.add("aikb-app-page", "aikb-dashboard-page");
    document.body.classList.remove("aikb-workspace-page");

    var featured = topicCards().slice(0, 4);
    var recent = topicCards();
    root.innerHTML =
      "<section class=\"aikb-dashboard\">" +
      "<header class=\"aikb-dashboard__topbar\">" +
      "<nav class=\"aikb-dashboard__tabs\" aria-label=\"Library filters\">" +
      "<a class=\"is-active\" href=\"/\">All</a>" +
      "<a href=\"/agents/\">Agent Engineering</a>" +
      "<a href=\"/production/rag/\">Production AI</a>" +
      "<a href=\"/learning-tools/\">Learning Tools</a>" +
      "</nav>" +
      "<div class=\"aikb-dashboard__controls\">" +
      "<button type=\"button\" title=\"Search\">" +
      icon("search") +
      "</button>" +
      "<button type=\"button\" title=\"Grid view\">" +
      icon("grid") +
      "</button>" +
      "<button type=\"button\" class=\"aikb-dashboard__primary\">Create new</button>" +
      "</div>" +
      "</header>" +
      "<div class=\"aikb-dashboard__section-heading\">" +
      "<h1>Featured notebooks</h1>" +
      "<a href=\"/start-here/\">Start here</a>" +
      "</div>" +
      "<div class=\"aikb-featured-grid\">" +
      featured.map(featuredCard).join("") +
      "</div>" +
      "<div class=\"aikb-dashboard__section-heading aikb-dashboard__section-heading--recent\">" +
      "<h2>Recent notebooks</h2>" +
      "</div>" +
      "<div class=\"aikb-notebook-grid\">" +
      "<a class=\"aikb-create-card\" href=\"/start-here/\"><span>+</span><strong>Create new notebook</strong></a>" +
      recent.map(notebookCard).join("") +
      "</div>" +
      "</section>";
  }

  function featuredCard(card) {
    return (
      "<a class=\"aikb-feature-card aikb-accent-" +
      card.accent +
      "\" href=\"" +
      card.href +
      "\">" +
      "<span class=\"aikb-card-mark\">" +
      escapeHtml(card.mark) +
      "</span>" +
      "<span class=\"aikb-card-source\">AI Engineering Intelligence</span>" +
      "<strong>" +
      escapeHtml(card.title) +
      "</strong>" +
      "<small>" +
      escapeHtml(card.meta) +
      "</small>" +
      "</a>"
    );
  }

  function notebookCard(card) {
    return (
      "<a class=\"aikb-notebook-card aikb-accent-" +
      card.accent +
      "\" href=\"" +
      card.href +
      "\">" +
      "<span class=\"aikb-notebook-card__menu\">...</span>" +
      "<span class=\"aikb-card-mark\">" +
      escapeHtml(card.mark) +
      "</span>" +
      "<strong>" +
      escapeHtml(card.title) +
      "</strong>" +
      "<p>" +
      escapeHtml(card.summary) +
      "</p>" +
      "<small>" +
      escapeHtml(card.meta) +
      "</small>" +
      "</a>"
    );
  }

  function sourceItems(reader) {
    var links = Array.prototype.slice.call(reader.querySelectorAll("a[href^='http']")).slice(0, 18);
    if (!links.length) {
      return [
        { label: pageTitle(reader), type: "Current page" },
        { label: "Source-backed handbook content", type: "Local document" },
      ];
    }
    return links.map(function (link) {
      return {
        label: truncate(clean(link.textContent) || link.href, 46),
        type: new URL(link.href).hostname.replace(/^www\./, ""),
      };
    });
  }

  function buildWorkspace() {
    var root = article();
    if (!root || root.querySelector(".aikb-workspace")) {
      return;
    }

    document.body.classList.add("aikb-app-page", "aikb-workspace-page");
    document.body.classList.remove("aikb-dashboard-page");

    var children = Array.prototype.slice.call(root.childNodes);
    var title = pageTitle(root);

    var appHeader = document.createElement("header");
    appHeader.className = "aikb-app-header";
    appHeader.innerHTML =
      "<a class=\"aikb-app-brand\" href=\"/\" aria-label=\"Back to notebooks\">AI</a>" +
      "<div class=\"aikb-app-title\">" +
      escapeHtml(title) +
      "</div>" +
      "<div class=\"aikb-app-actions\">" +
      "<a href=\"/\">Notebook library</a>" +
      "<a href=\"/learning-tools/\">Learning tools</a>" +
      "</div>";

    var workspace = document.createElement("section");
    workspace.className = "aikb-workspace";
    workspace.innerHTML =
      "<aside class=\"aikb-sources-pane\"><div class=\"aikb-pane-title\"><span>Sources</span><button type=\"button\" title=\"Collapse sources\">||</button></div><button class=\"aikb-add-source\" type=\"button\">+ Add sources</button><div class=\"aikb-source-list\"></div></aside>" +
      "<main class=\"aikb-reader-pane\"><div class=\"aikb-pane-title\"><span>Reading</span><div><button type=\"button\" title=\"Reading settings\">" +
      icon("sliders") +
      "</button></div></div><article class=\"aikb-reader\"></article></main>" +
      "<aside class=\"aikb-studio-pane\"><div class=\"aikb-pane-title\"><span>Studio</span><button type=\"button\" title=\"Collapse studio\">||</button></div><div class=\"aikb-studio-grid\">" +
      toolButton("audio", "audio", "Audio Overview") +
      toolButton("guide", "guide", "Study Guide") +
      toolButton("mindmap", "map", "Mind Map") +
      toolButton("flashcards", "cards", "Flashcards") +
      toolButton("quiz", "quiz", "Quiz") +
      "</div><div class=\"aikb-study-panel__output\" aria-live=\"polite\"></div><button class=\"aikb-add-note\" type=\"button\">Add note</button></aside>";

    root.innerHTML = "";
    root.appendChild(appHeader);
    root.appendChild(workspace);

    var reader = workspace.querySelector(".aikb-reader");
    children.forEach(function (child) {
      reader.appendChild(child);
    });

    var sourceList = workspace.querySelector(".aikb-source-list");
    sourceList.innerHTML = sourceItems(reader)
      .map(function (source) {
        return (
          "<div class=\"aikb-source-item\"><span>" +
          icon("doc") +
          "</span><div><strong>" +
          escapeHtml(source.label) +
          "</strong><small>" +
          escapeHtml(source.type) +
          "</small></div><input type=\"checkbox\" checked aria-label=\"Use source\"></div>"
        );
      })
      .join("");

    var output = workspace.querySelector(".aikb-study-panel__output");

    workspace.addEventListener("click", function (event) {
      var backButton = event.target.closest("[data-study-back]");
      if (backButton) {
        output.dataset.open = "false";
        stopAudio();
        return;
      }

      var button = event.target.closest("[data-tool]");
      if (!button) {
        return;
      }
      var tool = button.getAttribute("data-tool");
      if (tool === "quiz") {
        renderQuiz(reader, output);
      } else if (tool === "flashcards") {
        renderFlashcards(reader, output);
      } else if (tool === "audio") {
        renderAudio(reader, output);
      } else if (tool === "mindmap") {
        renderMindMap(reader, output);
      } else if (tool === "guide") {
        renderGuide(reader, output);
      }
    });
  }

  function enhanceApp() {
    if (isHomePage()) {
      buildDashboard();
      return;
    }
    buildWorkspace();
  }

  var COMMON_WORDS = {
    about: true,
    across: true,
    after: true,
    again: true,
    agent: true,
    agents: true,
    before: true,
    being: true,
    between: true,
    every: true,
    should: true,
    source: true,
    sources: true,
    system: true,
    systems: true,
    their: true,
    there: true,
    these: true,
    those: true,
    tools: true,
    using: true,
    whether: true,
    which: true,
    while: true,
    with: true,
    workflow: true,
    workflows: true,
  };

  ready(enhanceApp);

  if (typeof document$ !== "undefined") {
    document$.subscribe(enhanceApp);
  }
})();
