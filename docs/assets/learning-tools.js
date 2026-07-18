(function () {
  "use strict";

  var MAX_ITEMS = 8;
  var NOTES_KEY = "aikb.notes.v1";
  var MIND_MAP_KEY = "aikb.mindmaps.v1";
  var CHAT_KEY = "aikb.chat.v1";
  var sourcePreviewCache = null;

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
          text: clean(node.textContent.replace(/[¶#]/g, "")),
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
      return clean(node.textContent.replace(/[¶#]/g, "")) === headingText;
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
    output.classList.remove("aikb-study-panel__output--map", "aikb-study-panel__output--quiz");
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
    close.textContent = "×";
    close.setAttribute("aria-label", "Close");
    close.setAttribute("title", "Close");
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
    output.classList.add("aikb-study-panel__output--quiz");

    var sectionFacts = headings(root)
      .map(function (heading) {
        var fact = sectionText(root, heading.text)
          .split(/(?<=[.!?])\s+/)
          .map(clean)
          .find(function (sentence) {
            return sentence.length > 45 && sentence.length < 230;
          });
        return fact ? { topic: heading.text, fact: fact } : null;
      })
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
    if (sectionFacts.length < 4) {
      sectionFacts = sentences(root)
        .slice(0, MAX_ITEMS)
        .map(function (fact, index) {
          return { topic: "the page's key ideas", fact: fact, index: index };
        });
    }
    if (sectionFacts.length < 2) {
      renderEmpty(output);
      return;
    }

    var questions = sectionFacts.map(function (item, index) {
      var distractors = [];
      for (var offset = 1; offset < sectionFacts.length && distractors.length < 3; offset += 1) {
        var candidate = sectionFacts[(index + offset) % sectionFacts.length].fact;
        if (candidate !== item.fact && distractors.indexOf(candidate) === -1) {
          distractors.push(candidate);
        }
      }
      while (distractors.length < 3) {
        distractors.push(
          [
            "This topic is presented as independent from the surrounding engineering workflow.",
            "The page recommends avoiding validation until after production deployment.",
            "The section treats observability and evaluation as interchangeable concerns.",
          ][distractors.length]
        );
      }
      var correctIndex = index % 4;
      var options = distractors.slice(0, 3);
      options.splice(correctIndex, 0, item.fact);
      return {
        prompt: "Which statement does this page make about “" + item.topic + "”?",
        hint: "Look for the option grounded directly in the “" + item.topic + "” section.",
        options: options,
        correctIndex: correctIndex,
      };
    });

    var quiz = document.createElement("section");
    quiz.className = "aikb-quiz";
    output.appendChild(quiz);
    var current = 0;
    var score = 0;
    var answers = [];

    function renderQuestion() {
      var question = questions[current];
      var selected = answers[current];
      quiz.innerHTML =
        "<div class=\"aikb-quiz__progress\"><span>" +
        (current + 1) +
        " / " +
        questions.length +
        "</span><span class=\"aikb-quiz__track\"><i style=\"width:" +
        ((current + 1) / questions.length) * 100 +
        "%\"></i></span></div>" +
        "<fieldset class=\"aikb-quiz__question\"><legend tabindex=\"-1\">" +
        escapeHtml(question.prompt) +
        "</legend><div class=\"aikb-quiz__options\">" +
        question.options
          .map(function (option, optionIndex) {
            return (
              "<label class=\"aikb-quiz__option" +
              (selected === optionIndex ? " is-selected" : "") +
              "\"><input type=\"radio\" name=\"quiz-answer\" value=\"" +
              optionIndex +
              "\"" +
              (selected === optionIndex ? " checked" : "") +
              "><span class=\"aikb-quiz__letter\">" +
              String.fromCharCode(65 + optionIndex) +
              ".</span><span>" +
              escapeHtml(option) +
              "</span></label>"
            );
          })
          .join("") +
        "</div></fieldset><div class=\"aikb-quiz__footer\"><details class=\"aikb-quiz__hint\"><summary>Hint</summary><p>" +
        escapeHtml(question.hint) +
        "</p></details><button class=\"aikb-quiz__next\" type=\"button\" data-quiz-next" +
        (selected === undefined ? " disabled" : "") +
        ">" +
        (current === questions.length - 1 ? "See results" : "Next") +
        "</button></div>";
    }

    quiz.addEventListener("change", function (event) {
      var input = event.target.closest("input[name='quiz-answer']");
      if (!input) {
        return;
      }
      answers[current] = Number(input.value);
      renderQuestion();
      quiz.querySelector("input:checked").focus();
    });
    quiz.addEventListener("click", function (event) {
      if (!event.target.closest("[data-quiz-next]")) {
        return;
      }
      if (answers[current] === questions[current].correctIndex) {
        score += 1;
      }
      if (current < questions.length - 1) {
        current += 1;
        renderQuestion();
        quiz.querySelector("legend").focus({ preventScroll: true });
        return;
      }
      quiz.innerHTML =
        "<div class=\"aikb-quiz__results\"><span>Quiz complete</span><strong>" +
        score +
        " / " +
        questions.length +
        "</strong><p>You answered " +
        Math.round((score / questions.length) * 100) +
        "% correctly.</p><button type=\"button\" data-quiz-restart>Try again</button></div>";
    });
    quiz.addEventListener("click", function (event) {
      if (!event.target.closest("[data-quiz-restart]")) {
        return;
      }
      current = 0;
      score = 0;
      answers = [];
      renderQuestion();
    });
    renderQuestion();
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
      card.setAttribute("aria-pressed", "false");
      card.dataset.title = heading.text;
      card.dataset.content = truncate(answer, 500);
      card.innerHTML =
        "<div class=\"aikb-study-card__flip\" role=\"button\" tabindex=\"0\" aria-label=\"Show answer for " +
        escapeHtml(heading.text) +
        "\">" +
        "<span class=\"aikb-study-card__inner\">" +
        "<span class=\"aikb-study-card__face aikb-study-card__front\"><span class=\"aikb-study-card__eyebrow\">Title</span><strong>" +
        escapeHtml(heading.text) +
        "</strong><small>Click to reveal</small></span>" +
        "<span class=\"aikb-study-card__face aikb-study-card__back\"><span class=\"aikb-study-card__backbar\"><span class=\"aikb-study-card__eyebrow\">Content</span><span class=\"aikb-card-menu\"><button type=\"button\" data-card-menu aria-label=\"Card menu\">...</button><span class=\"aikb-card-menu__items\" hidden><button type=\"button\" data-card-listen>Listen</button><button type=\"button\" data-card-add-note>Add to note</button></span></span></span><span>" +
        escapeHtml(truncate(answer, 260)) +
        "</span><small>Source section: " +
        escapeHtml(heading.text) +
        "</small></span>" +
        "</span></div>";
      var flip = card.querySelector(".aikb-study-card__flip");
      function toggleCard() {
        var flipped = card.dataset.flipped === "true";
        card.dataset.flipped = flipped ? "false" : "true";
        card.setAttribute("aria-pressed", flipped ? "false" : "true");
        flip.setAttribute(
          "aria-label",
          (flipped ? "Show answer for " : "Show title for ") + heading.text
        );
      }
      flip.addEventListener("click", function (event) {
        if (event.target.closest("button")) {
          return;
        }
        toggleCard();
      });
      flip.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleCard();
        }
      });
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

  function mindMapStorage() {
    try {
      var maps = JSON.parse(window.localStorage.getItem(MIND_MAP_KEY) || "{}");
      return maps && typeof maps === "object" && !Array.isArray(maps) ? maps : {};
    } catch (_error) {
      return {};
    }
  }

  function mindMapFingerprint(root) {
    return Array.prototype.slice
      .call(root.querySelectorAll("h1, h2, h3, p, li"))
      .filter(function (node) {
        return !node.closest(".aikb-study-panel, .aikb-source-preview");
      })
      .map(function (node) {
        return node.tagName + ":" + clean(node.textContent).length;
      })
      .join("|");
  }

  function tagMindMapTargets(root) {
    Array.prototype.slice.call(root.querySelectorAll("h2, h3, p, li")).forEach(function (node, index) {
      if (!node.closest(".aikb-study-panel, .aikb-source-preview")) {
        node.dataset.knowledgeId = "aikb-knowledge-" + index;
      }
    });
  }

  function mindMapLeaf(node, index, parentId) {
    var text = clean(node.textContent);
    var targetId = "aikb-knowledge-" + index;
    node.dataset.knowledgeId = targetId;
    return {
      id: parentId + "-item-" + index,
      label: truncate(text, 92),
      summary: text,
      targetId: targetId,
      type: node.tagName === "LI" ? "item" : "detail",
      children: [],
    };
  }

  function generateMindMap(root, sources) {
    var title = pageTitle(root);
    var contentNodes = Array.prototype.slice.call(root.querySelectorAll("h2, h3, p, li"));
    var map = {
      version: 1,
      path: location.pathname,
      title: title,
      fingerprint: mindMapFingerprint(root),
      generatedAt: new Date().toISOString(),
      root: {
        id: "root",
        label: title,
        summary: "Knowledge map for " + title,
        type: "root",
        children: [],
      },
    };
    var currentSection = null;
    var currentSubsection = null;

    contentNodes.forEach(function (node, index) {
      if (node.closest(".aikb-study-panel, .aikb-source-preview")) {
        return;
      }
      var text = clean(node.textContent.replace("#", ""));
      if (!text) {
        return;
      }
      if (node.tagName === "H2") {
        node.dataset.knowledgeId = "aikb-knowledge-" + index;
        currentSection = {
          id: "section-" + index,
          label: text,
          summary: sectionText(root, text),
          targetId: node.dataset.knowledgeId,
          type: "topic",
          children: [],
        };
        map.root.children.push(currentSection);
        currentSubsection = null;
        return;
      }
      if (node.tagName === "H3") {
        node.dataset.knowledgeId = "aikb-knowledge-" + index;
        currentSubsection = {
          id: "subsection-" + index,
          label: text,
          summary: sectionText(root, text),
          targetId: node.dataset.knowledgeId,
          type: "subtopic",
          children: [],
        };
        if (!currentSection) {
          currentSection = {
            id: "section-overview",
            label: "Overview",
            summary: "Introductory knowledge",
            type: "topic",
            children: [],
          };
          map.root.children.push(currentSection);
        }
        currentSection.children.push(currentSubsection);
        return;
      }
      if (!currentSection) {
        currentSection = {
          id: "section-overview",
          label: "Overview",
          summary: "Introductory knowledge",
          type: "topic",
          children: [],
        };
        map.root.children.push(currentSection);
      }
      var parent = currentSubsection || currentSection;
      parent.children.push(mindMapLeaf(node, index, parent.id));
    });

    if (sources.length) {
      map.root.children.push({
        id: "sources",
        label: "Sources",
        summary: sources.length + " cited source pages",
        type: "sources",
        children: sources.map(function (source, index) {
          return {
            id: "source-" + index,
            label: source.label,
            summary: source.description,
            href: source.href,
            type: "source",
            children: [],
          };
        }),
      });
    }
    return map;
  }

  function saveMindMap(map) {
    try {
      var maps = mindMapStorage();
      maps[map.path] = map;
      window.localStorage.setItem(MIND_MAP_KEY, JSON.stringify(maps));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function drawMindMap(map, output, root, sources, topicHtml) {
    tagMindMapTargets(root);
    clear(output);
    header(output, "Mind Map");
    output.classList.add("aikb-study-panel__output--map");

    var artifact = document.createElement("section");
    artifact.className = "aikb-mindmap-artifact";
    artifact.innerHTML =
      "<div class=\"aikb-map-toolbar\"><div><strong>Knowledge atlas</strong><span>Generated " +
      new Date(map.generatedAt).toLocaleString() +
      " · Expand topics, then open a leaf in Reading</span></div><div class=\"aikb-map-controls\"><button type=\"button\" data-map-zoom-out aria-label=\"Zoom out\">−</button><output data-map-zoom>100%</output><button type=\"button\" data-map-zoom-in aria-label=\"Zoom in\">+</button><button type=\"button\" data-map-fit>Fit</button><button type=\"button\" data-map-regenerate>Regenerate</button></div></div>" +
      "<div class=\"aikb-map-viewport\" tabindex=\"0\" aria-label=\"Mind map canvas. Drag to pan, use arrow keys to move, and plus or minus to zoom.\"><div class=\"aikb-map-stage\"><div class=\"aikb-map-scene\"><svg class=\"aikb-map-connectors\" aria-hidden=\"true\"></svg><div class=\"aikb-map-nodes\"></div></div></div></div>";
    output.appendChild(artifact);

    var viewport = artifact.querySelector(".aikb-map-viewport");
    var stage = artifact.querySelector(".aikb-map-stage");
    var scene = artifact.querySelector(".aikb-map-scene");
    var connectors = artifact.querySelector(".aikb-map-connectors");
    var nodesLayer = artifact.querySelector(".aikb-map-nodes");
    var zoomOutput = artifact.querySelector("[data-map-zoom]");
    var zoom = 1;
    var sceneWidth = 800;
    var sceneHeight = 500;
    var expanded = {};
    expanded[map.root.id] = true;

    function setZoom(nextZoom, keepCenter) {
      var oldZoom = zoom;
      var centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / oldZoom;
      var centerY = (viewport.scrollTop + viewport.clientHeight / 2) / oldZoom;
      zoom = Math.min(1.4, Math.max(0.55, nextZoom));
      scene.style.setProperty("--aikb-map-zoom", zoom);
      stage.style.width = sceneWidth * zoom + "px";
      stage.style.height = sceneHeight * zoom + "px";
      zoomOutput.textContent = Math.round(zoom * 100) + "%";
      if (keepCenter !== false) {
        viewport.scrollLeft = centerX * zoom - viewport.clientWidth / 2;
        viewport.scrollTop = centerY * zoom - viewport.clientHeight / 2;
      }
    }

    function visibleLayout() {
      var positions = [];
      var edges = [];
      var nextY = 32;
      var maxDepth = 0;
      function visit(node, depth, parent) {
        maxDepth = Math.max(maxDepth, depth);
        var position = { node: node, x: 48 + depth * 286, y: 0 };
        positions.push(position);
        if (parent) {
          edges.push({ from: parent, to: position, depth: depth });
        }
        var showChildren = node.children && node.children.length && expanded[node.id];
        if (showChildren) {
          var childPositions = node.children.map(function (child) {
            return visit(child, depth + 1, position);
          });
          position.y =
            (childPositions[0].y + childPositions[childPositions.length - 1].y) / 2;
        } else {
          position.y = nextY;
          nextY += 58;
        }
        return position;
      }
      visit(map.root, 0, null);
      return {
        positions: positions,
        edges: edges,
        width: Math.max(760, 48 + (maxDepth + 1) * 286 + 260),
        height: Math.max(480, nextY + 40),
      };
    }

    function renderGraph(focusId) {
      var layout = visibleLayout();
      sceneWidth = layout.width;
      sceneHeight = layout.height;
      scene.style.width = sceneWidth + "px";
      scene.style.height = sceneHeight + "px";
      connectors.setAttribute("viewBox", "0 0 " + sceneWidth + " " + sceneHeight);
      connectors.setAttribute("width", sceneWidth);
      connectors.setAttribute("height", sceneHeight);
      connectors.innerHTML = layout.edges
        .map(function (edge) {
          var startX = edge.from.x + 226;
          var startY = edge.from.y + 20;
          var endX = edge.to.x;
          var endY = edge.to.y + 20;
          var curve = Math.max(55, (endX - startX) * 0.52);
          return (
            "<path class=\"aikb-map-connector aikb-map-connector--" +
            ((edge.depth - 1) % 5) +
            "\" d=\"M " +
            startX +
            " " +
            startY +
            " C " +
            (startX + curve) +
            " " +
            startY +
            ", " +
            (endX - curve) +
            " " +
            endY +
            ", " +
            endX +
            " " +
            endY +
            "\"></path>"
          );
        })
        .join("");
      nodesLayer.innerHTML = layout.positions
        .map(function (position) {
          var node = position.node;
          var hasChildren = node.children && node.children.length;
          var isExpanded = Boolean(expanded[node.id]);
          return (
            "<button class=\"aikb-map-node aikb-map-node--" +
            node.type +
            "\" type=\"button\" data-map-node data-node-id=\"" +
            escapeHtml(node.id) +
            "\" data-target-id=\"" +
            escapeHtml(node.targetId || "") +
            "\" data-source-href=\"" +
            escapeHtml(node.href || "") +
            "\" data-has-children=\"" +
            (hasChildren ? "true" : "false") +
            "\" aria-expanded=\"" +
            (hasChildren ? String(isExpanded) : "false") +
            "\" title=\"" +
            escapeHtml(node.summary || node.label) +
            "\" style=\"left:" +
            position.x +
            "px;top:" +
            position.y +
            "px\"><span>" +
            escapeHtml(node.label) +
            "</span>" +
            (hasChildren
              ? "<small aria-hidden=\"true\">" + (isExpanded ? "‹" : "›") + "</small>"
              : "") +
            "</button>"
          );
        })
        .join("");
      setZoom(zoom, false);
      if (focusId) {
        var focusNode = nodesLayer.querySelector("[data-node-id='" + focusId + "']");
        if (focusNode) {
          focusNode.focus({ preventScroll: true });
        }
      }
    }

    renderGraph();
    window.requestAnimationFrame(function () {
      var rootNode = nodesLayer.querySelector("[data-node-id='root']");
      if (rootNode) {
        viewport.scrollLeft = Math.max(0, rootNode.offsetLeft - viewport.clientWidth * 0.22);
        viewport.scrollTop = Math.max(
          0,
          rootNode.offsetTop * zoom - viewport.clientHeight / 2 + 20
        );
      }
    });
    artifact.querySelector("[data-map-zoom-out]").addEventListener("click", function () {
      setZoom(zoom - 0.1);
    });
    artifact.querySelector("[data-map-zoom-in]").addEventListener("click", function () {
      setZoom(zoom + 0.1);
    });
    artifact.querySelector("[data-map-fit]").addEventListener("click", function () {
      var fitZoom = Math.min(
        1,
        (viewport.clientWidth - 40) / sceneWidth,
        (viewport.clientHeight - 40) / sceneHeight
      );
      setZoom(fitZoom, false);
      viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    });
    artifact.querySelector("[data-map-regenerate]").addEventListener("click", function () {
      var regenerated = generateMindMap(root, sources);
      saveMindMap(regenerated);
      drawMindMap(regenerated, output, root, sources, topicHtml);
    });
    artifact.addEventListener("click", function (event) {
      var node = event.target.closest("[data-map-node]");
      if (!node) {
        return;
      }
      if (node.dataset.hasChildren === "true") {
        if (expanded[node.dataset.nodeId]) {
          delete expanded[node.dataset.nodeId];
        } else {
          expanded[node.dataset.nodeId] = true;
        }
        renderGraph(node.dataset.nodeId);
        return;
      }
      var sourceHref = node.dataset.sourceHref;
      if (sourceHref) {
        var source = sources.find(function (item) {
          return item.href === sourceHref;
        });
        if (source) {
          output.dataset.open = "false";
          output.classList.remove("aikb-study-panel__output--map");
          renderSourcePreview(root, topicHtml, source);
        }
        return;
      }
      var target = root.querySelector("[data-knowledge-id='" + node.dataset.targetId + "']");
      if (target) {
        output.dataset.open = "false";
        output.classList.remove("aikb-study-panel__output--map");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("aikb-knowledge-focus");
        window.setTimeout(function () {
          target.classList.remove("aikb-knowledge-focus");
        }, 2200);
      }
    });

    var dragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var scrollStartX = 0;
    var scrollStartY = 0;
    viewport.addEventListener("pointerdown", function (event) {
      if (event.target.closest("[data-map-node]")) {
        return;
      }
      dragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      scrollStartX = viewport.scrollLeft;
      scrollStartY = viewport.scrollTop;
      viewport.dataset.dragging = "true";
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointermove", function (event) {
      if (!dragging) {
        return;
      }
      viewport.scrollLeft = scrollStartX - (event.clientX - dragStartX);
      viewport.scrollTop = scrollStartY - (event.clientY - dragStartY);
    });
    function stopDragging(event) {
      if (!dragging) {
        return;
      }
      dragging = false;
      viewport.dataset.dragging = "false";
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    }
    viewport.addEventListener("pointerup", stopDragging);
    viewport.addEventListener("pointercancel", stopDragging);
    viewport.addEventListener("keydown", function (event) {
      if (event.target !== viewport) {
        return;
      }
      var distance = event.shiftKey ? 180 : 70;
      if (event.key === "ArrowLeft") {
        viewport.scrollLeft -= distance;
      } else if (event.key === "ArrowRight") {
        viewport.scrollLeft += distance;
      } else if (event.key === "ArrowUp") {
        viewport.scrollTop -= distance;
      } else if (event.key === "ArrowDown") {
        viewport.scrollTop += distance;
      } else if (event.key === "+" || event.key === "=") {
        setZoom(zoom + 0.1);
      } else if (event.key === "-" || event.key === "_") {
        setZoom(zoom - 0.1);
      } else if (event.key === "Home") {
        viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
      } else {
        return;
      }
      event.preventDefault();
    });
    viewport.addEventListener(
      "wheel",
      function (event) {
        if (!event.ctrlKey && !event.metaKey) {
          return;
        }
        event.preventDefault();
        setZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
      },
      { passive: false }
    );
  }

  function renderMindMap(root, output, sources, topicHtml) {
    clear(output);
    header(output, "Mind Map");
    output.classList.add("aikb-study-panel__output--map");
    var maps = mindMapStorage();
    var cached = maps[location.pathname];
    var fingerprint = mindMapFingerprint(root);
    if (cached && cached.version === 1 && cached.fingerprint === fingerprint) {
      drawMindMap(cached, output, root, sources, topicHtml);
      return;
    }
    var loading = document.createElement("div");
    loading.className = "aikb-map-generating";
    loading.innerHTML =
      "<span class=\"aikb-map-generating__orbit\" aria-hidden=\"true\"></span><strong>Organizing this page into knowledge nodes…</strong><small>Reading headings, details, list items, and cited sources</small>";
    output.appendChild(loading);
    window.setTimeout(function () {
      var generated = generateMindMap(root, sources);
      saveMindMap(generated);
      drawMindMap(generated, output, root, sources, topicHtml);
    }, 240);
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

  function loadNotes() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(NOTES_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveNotes(notes) {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  function addNote(note) {
    var notes = loadNotes();
    var category = note.category || note.source || "General";
    var duplicate = notes.some(function (existing) {
      return (
        existing.category === category &&
        existing.title === note.title &&
        existing.content === note.content
      );
    });
    if (duplicate) {
      renderNotesPanel();
      return false;
    }
    notes.unshift({
      id: "note-" + Date.now(),
      title: note.title,
      content: note.content,
      category: category,
      source: note.source,
      createdAt: new Date().toISOString(),
    });
    saveNotes(notes);
    renderNotesPanel();
    return true;
  }

  function renderNotesPanel() {
    var panel = document.querySelector(".aikb-notes-panel");
    if (!panel) {
      return;
    }
    var notes = loadNotes();
    var groups = notes.reduce(function (accumulator, note) {
      var category = note.category || note.source || "General";
      if (!accumulator[category]) {
        accumulator[category] = [];
      }
      accumulator[category].push(note);
      return accumulator;
    }, {});
    panel.dataset.open = "true";
    panel.innerHTML =
      "<div class=\"aikb-notes-panel__header\"><div><span>Notes</span><strong>" +
      notes.length +
      " saved</strong></div><button type=\"button\" data-notes-close aria-label=\"Close notes\" title=\"Close notes\">×</button></div>" +
      "<div class=\"aikb-notes-actions\"><button type=\"button\" data-note-new>New note</button><button type=\"button\" data-google-docs-export>Save to Google Docs</button></div>" +
      (notes.length
        ? "<div class=\"aikb-notes-list\">" +
          Object.keys(groups)
            .map(function (category) {
              return (
                "<section class=\"aikb-note-category\"><h3>" +
                escapeHtml(category) +
                "</h3>" +
                groups[category]
                  .map(function (note) {
                    return (
                      "<article class=\"aikb-note-item\"><strong>" +
                      escapeHtml(note.title) +
                      "</strong><p>" +
                      escapeHtml(truncate(note.content, 180)) +
                      "</p><small>" +
                      escapeHtml(note.source || category) +
                      "</small></article>"
                    );
                  })
                  .join("") +
                "</section>"
              );
            })
            .join("") +
          "</div>"
        : "<div class=\"aikb-source-empty\"><strong>No notes yet</strong><span>Add flashcards or create a manual note while studying.</span></div>");
  }

  function closeCardMenus(root) {
    Array.prototype.slice.call(root.querySelectorAll(".aikb-card-menu__items")).forEach(function (menu) {
      menu.hidden = true;
    });
  }

  function markCardSaved(card) {
    var button = card.querySelector("[data-card-add-note]");
    if (!button) {
      return;
    }
    button.textContent = "Added";
    button.disabled = true;
  }

  function syncSavedCards(root, category) {
    var notes = loadNotes();
    Array.prototype.slice.call(root.querySelectorAll(".aikb-study-card")).forEach(function (card) {
      var saved = notes.some(function (note) {
        return (
          note.category === category &&
          note.title === card.dataset.title &&
          note.content === card.dataset.content
        );
      });
      if (saved) {
        markCardSaved(card);
      }
    });
  }

  function createManualNote(pageTitleText) {
    var title = window.prompt("Note title", pageTitleText || "Study note");
    if (!title) {
      return;
    }
    var content = window.prompt("Note content");
    if (!content) {
      return;
    }
    addNote({
      title: title,
      content: content,
      category: pageTitleText || "General",
      source: "Manual note",
    });
  }

  function exportNotesToGoogleDocs() {
    var notes = loadNotes();
    if (!notes.length) {
      window.alert("Add at least one note before saving to Google Docs.");
      return;
    }
    var config = window.AIKB_GOOGLE_DOCS || {};
    if (!config.exportEndpoint) {
      showGoogleDocsSetup();
      return;
    }
    fetch(config.exportEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes }),
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Google Docs export failed.");
        }
        return response.json();
      })
      .then(function (result) {
        window.alert(result.url ? "Saved to Google Docs: " + result.url : "Saved to Google Docs.");
      })
      .catch(function (error) {
        window.alert(error.message);
      });
  }

  function showGoogleDocsSetup() {
    window.alert(
      "Google Docs saving needs a backend OAuth endpoint. Use Google Identity Services authorization code flow, exchange the code server-side, then call the Google Docs API with the documents or drive.file scope."
    );
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
      chat: "<path d=\"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z\"></path><path d=\"M8 9h8\"></path><path d=\"M8 13h5\"></path>",
      doc: "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z\"></path><path d=\"M14 2v6h6\"></path>",
      guide: "<path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"></path><path d=\"M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z\"></path>",
      grid: "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"></rect><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"></rect>",
      map: "<circle cx=\"6\" cy=\"6\" r=\"2\"></circle><circle cx=\"18\" cy=\"6\" r=\"2\"></circle><circle cx=\"12\" cy=\"18\" r=\"2\"></circle><path d=\"m8 7 3 8\"></path><path d=\"m16 7-3 8\"></path><path d=\"M8 6h8\"></path>",
      menu: "<path d=\"M4 6h16\"></path><path d=\"M4 12h16\"></path><path d=\"M4 18h16\"></path>",
      note: "<path d=\"M4 4h16v16H4z\"></path><path d=\"M8 8h8\"></path><path d=\"M8 12h8\"></path><path d=\"M8 16h5\"></path>",
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
        title: "Framework Comparison",
        href: "/agents/framework-comparison/",
        meta: "Agent Engineering - 9 sections",
        accent: "amber",
        mark: "FW",
        summary: "Choosing Responses API, Agents SDK, or LangGraph",
      },
      {
        title: "LangGraph",
        href: "/agents/langgraph/",
        meta: "Agent Engineering - 9 sections",
        accent: "cyan",
        mark: "LG",
        summary: "State graphs, checkpoints, interrupts, durability",
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
        title: "Codex",
        href: "/coding/codex/",
        meta: "AI Coding - 8 sections",
        accent: "blue",
        mark: "CX",
        summary: "Cloud and local coding-agent workflows",
      },
      {
        title: "Cursor",
        href: "/coding/cursor/",
        meta: "AI Coding - 9 sections",
        accent: "green",
        mark: "CU",
        summary: "Editor-native agents, rules, tools, and MCP",
      },
      {
        title: "Claude Code",
        href: "/coding/claude-code/",
        meta: "AI Coding - 9 sections",
        accent: "violet",
        mark: "CC",
        summary: "Terminal agent loops, skills, sessions, and verification",
      },
      {
        title: "AI Skills",
        href: "/coding/ai-skills/",
        meta: "AI Coding - 10 sections",
        accent: "lime",
        mark: "SK",
        summary: "Reusable workflows and agent capability packages",
      },
      {
        title: "Learning Tools",
        href: "/learning-tools/",
        meta: "Learning - 6 sections",
        accent: "rose",
        mark: "LT",
        summary: "Audio reviews, quizzes, mind maps, flashcards",
      },
      {
        title: "Tutorials",
        href: "/tutorials/",
        meta: "Practice - 8 sections",
        accent: "slate",
        mark: "T",
        summary: "Runnable paths for agents, RAG, and coding workflows",
      },
      {
        title: "Weekly Updates",
        href: "/weekly/",
        meta: "Refresh - 8 sections",
        accent: "lime",
        mark: "WU",
        summary: "Daily source refresh, pruning, digest review",
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
    var seen = {};
    return Array.prototype.slice
      .call(reader.querySelectorAll("a[href]"))
      .map(function (link) {
        try {
          return {
            label: truncate(clean(link.textContent) || link.href, 46),
            url: new URL(link.href, location.href),
          };
        } catch (_error) {
          return null;
        }
      })
      .filter(function (source) {
        if (!source || !/^https?:$/.test(source.url.protocol)) {
          return false;
        }
        if (source.url.hostname === location.hostname) {
          return false;
        }
        if (seen[source.url.href]) {
          return false;
        }
        seen[source.url.href] = true;
        return true;
      })
      .slice(0, 18)
      .map(function (source) {
        return {
          label: source.label,
          href: source.url.href,
          type: source.url.hostname.replace(/^www\./, ""),
          description: "Open source page",
        };
      });
  }

  function sourceDescription(entry, fallback) {
    if (!entry || !Array.isArray(entry.items)) {
      return fallback;
    }
    var summary = entry.items.find(function (item) {
      return item.tag === "p" && clean(item.text || "").length >= 24;
    });
    return summary ? truncate(clean(summary.text), 100) : fallback;
  }

  function populateSourceDescriptions(sourceList, sources) {
    fetchSourcePreviewCache().then(function (cache) {
      sources.forEach(function (source, index) {
        var description = sourceDescription(cache[source.href], source.description);
        source.description = description;
        var item = sourceList.querySelectorAll(".aikb-source-item")[index];
        var subtitle = item && item.querySelector("small");
        if (subtitle) {
          subtitle.textContent = description;
          subtitle.title = description;
        }
      });
    });
  }

  function renderSourcePreview(reader, topicHtml, source) {
    reader.innerHTML =
      "<section class=\"aikb-source-preview\" data-loading=\"true\">" +
      "<div class=\"aikb-source-preview__bar\"><button type=\"button\" data-source-back>Back to topic</button><a href=\"" +
      escapeHtml(source.href) +
      "\" target=\"_blank\" rel=\"noreferrer\">Open source page</a></div>" +
      "<p class=\"aikb-study-route\">Source preview / " +
      escapeHtml(source.type) +
      "</p>" +
      "<h1>" +
      escapeHtml(source.label) +
      "</h1>" +
      "<p class=\"aikb-source-preview__status\">Loading readable source content...</p>" +
      "<div class=\"aikb-source-preview__content\"></div>" +
      "</section>";

    var preview = reader.querySelector(".aikb-source-preview");
    var content = reader.querySelector(".aikb-source-preview__content");
    var status = reader.querySelector(".aikb-source-preview__status");
    reader.querySelector("[data-source-back]").addEventListener("click", function () {
      reader.innerHTML = topicHtml;
    });

    fetchCachedSource(source.href)
      .catch(function () {
        return fetchReadableSource(source.href);
      })
      .then(function (items) {
        preview.dataset.loading = "false";
        if (!items.length) {
          throw new Error("No readable content found.");
        }
        status.textContent = "Showing a readable preview extracted from the destination page.";
        items.forEach(function (item) {
          var node = document.createElement(item.tag);
          node.textContent = item.text;
          content.appendChild(node);
        });
      })
      .catch(function () {
        preview.dataset.loading = "false";
        status.textContent =
          "This destination does not expose readable content to the browser preview. Use the source link for the full page.";
        content.innerHTML =
          "<div class=\"aikb-source-preview__blocked\"><strong>Preview unavailable</strong><p>Some documentation sites block browser-side reading or embedding. The source is still linked above so you can open the original page when you need the full content.</p><a href=\"" +
          escapeHtml(source.href) +
          "\" target=\"_blank\" rel=\"noreferrer\">Open original source</a></div>";
      });
  }

  function fetchSourcePreviewCache() {
    if (!sourcePreviewCache) {
      sourcePreviewCache = fetch("/assets/source-previews.json", { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("No source preview cache.");
          }
          return response.json();
        })
        .catch(function () {
          return {};
        });
    }
    return sourcePreviewCache;
  }

  function fetchCachedSource(href) {
    return fetchSourcePreviewCache().then(function (cache) {
      var entry = cache[href];
      if (!entry || !Array.isArray(entry.items)) {
        throw new Error("Source is not cached.");
      }
      return entry.items;
    });
  }

  function fetchReadableSource(href) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, 6000);
    return fetch(href, { signal: controller.signal })
      .then(function (response) {
        window.clearTimeout(timer);
        if (!response.ok) {
          throw new Error("Source returned " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        Array.prototype.slice
          .call(doc.querySelectorAll("script, style, nav, header, footer, form, svg"))
          .forEach(function (node) {
            node.remove();
          });
        var container =
          doc.querySelector("main") ||
          doc.querySelector("article") ||
          doc.querySelector("[role='main']") ||
          doc.body;
        return Array.prototype.slice
          .call(container.querySelectorAll("h1, h2, h3, p, li"))
          .map(function (node) {
            return {
              tag: /^H[1-3]$/.test(node.tagName) ? node.tagName.toLowerCase() : "p",
              text: clean(node.textContent),
            };
          })
          .filter(function (item) {
            return item.text.length > 40;
          })
          .slice(0, 24);
      });
  }

  function chatState() {
    try {
      var state = JSON.parse(window.localStorage.getItem(CHAT_KEY) || "{}");
      return state && typeof state === "object" ? state : {};
    } catch (_error) {
      return {};
    }
  }

  function saveChatState(state) {
    try {
      window.localStorage.setItem(CHAT_KEY, JSON.stringify(state));
    } catch (_error) {
      // Chat remains usable when storage is disabled or full.
    }
  }

  function chatConfig() {
    var state = chatState();
    return {
      endpoint: state.endpoint || "http://127.0.0.1:11434",
      model: state.model || "gemma3:1b",
    };
  }

  function pageChatHistory() {
    var state = chatState();
    return state.history && Array.isArray(state.history[location.pathname])
      ? state.history[location.pathname]
      : [];
  }

  function savePageChatHistory(messages) {
    var state = chatState();
    state.history = state.history || {};
    state.history[location.pathname] = messages.slice(-30);
    saveChatState(state);
  }

  function chatChunks(reader) {
    var chunks = [];
    var current = { heading: pageTitle(reader), parts: [] };
    Array.prototype.slice.call(reader.querySelectorAll("h1, h2, h3, p, li, pre")).forEach(
      function (node) {
        if (node.closest(".aikb-source-preview, .aikb-study-panel")) {
          return;
        }
        var text = clean(node.textContent);
        if (!text) {
          return;
        }
        if (/^H[1-3]$/.test(node.tagName)) {
          if (current.parts.length) {
            chunks.push({ heading: current.heading, text: current.parts.join(" ") });
          }
          current = { heading: clean(text.replace("#", "")), parts: [] };
        } else {
          current.parts.push(text);
        }
      }
    );
    if (current.parts.length) {
      chunks.push({ heading: current.heading, text: current.parts.join(" ") });
    }
    return chunks.filter(function (chunk) {
      return chunk.text.length > 40;
    });
  }

  function retrieveChatContext(reader, question) {
    var queryTerms = clean(question)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(function (term) {
        return term.length > 2 && !COMMON_WORDS[term];
      });
    return chatChunks(reader)
      .map(function (chunk, index) {
        var haystack = (chunk.heading + " " + chunk.text).toLowerCase();
        var score = queryTerms.reduce(function (total, term) {
          return total + (haystack.indexOf(term) === -1 ? 0 : 1);
        }, 0);
        return { chunk: chunk, score: score, index: index };
      })
      .sort(function (left, right) {
        return right.score - left.score || left.index - right.index;
      })
      .slice(0, 8)
      .map(function (ranked) {
        return "## " + ranked.chunk.heading + "\n" + truncate(ranked.chunk.text, 1800);
      })
      .join("\n\n")
      .slice(0, 12000);
  }

  function relatedChatSections(reader, answer) {
    var normalized = answer.toLowerCase();
    return headings(reader)
      .map(function (heading) {
        return heading.text;
      })
      .filter(function (heading) {
        return normalized.indexOf(heading.toLowerCase()) !== -1;
      })
      .slice(0, 4);
  }

  function renderChatMessages(panel, reader, messages) {
    var conversation = panel.querySelector(".aikb-chat__messages");
    conversation.innerHTML = "";
    if (!messages.length) {
      conversation.innerHTML =
        "<div class=\"aikb-chat__welcome\"><span>Grounded in this page</span><strong>What would you like to understand?</strong><p>Ask for an explanation, compare concepts, or explore a specific section.</p></div>";
      return;
    }
    messages.forEach(function (message) {
      var article = document.createElement("article");
      article.className = "aikb-chat__message aikb-chat__message--" + message.role;
      var label = document.createElement("small");
      label.textContent = message.role === "user" ? "You" : "Learning guide";
      var body = document.createElement("p");
      body.textContent = message.content;
      article.appendChild(label);
      article.appendChild(body);
      if (message.role === "assistant") {
        var sections = relatedChatSections(reader, message.content);
        if (sections.length) {
          var links = document.createElement("div");
          links.className = "aikb-chat__section-links";
          sections.forEach(function (section) {
            var button = document.createElement("button");
            button.type = "button";
            button.dataset.chatSection = section;
            button.textContent = "Open " + section;
            links.appendChild(button);
          });
          article.appendChild(links);
        }
      }
      conversation.appendChild(article);
    });
    conversation.scrollTop = conversation.scrollHeight;
  }

  function streamOllamaChat(config, messages, onToken, signal) {
    var endpoint = config.endpoint.replace(/\/+$/, "") + "/api/chat";
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages: messages, stream: true }),
      signal: signal,
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Ollama returned " + response.status + ".");
      }
      if (!response.body || !response.body.getReader) {
        return response.json().then(function (payload) {
          onToken((payload.message && payload.message.content) || "");
        });
      }
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      function read() {
        return reader.read().then(function (result) {
          buffer += decoder.decode(result.value || new Uint8Array(), { stream: !result.done });
          var lines = buffer.split("\n");
          buffer = result.done ? "" : lines.pop();
          lines.forEach(function (line) {
            if (!line.trim()) {
              return;
            }
            var payload = JSON.parse(line);
            if (payload.message && payload.message.content) {
              onToken(payload.message.content);
            }
            if (payload.error) {
              throw new Error(payload.error);
            }
          });
          return result.done ? undefined : read();
        });
      }
      return read();
    });
  }

  function renderChatPanel(panel, reader) {
    var config = chatConfig();
    var messages = pageChatHistory();
    panel.dataset.open = "true";
    panel.innerHTML =
      "<div class=\"aikb-chat__header\"><div><span>Learning chat</span><small>Local · " +
      escapeHtml(config.model) +
      "</small></div><button type=\"button\" data-chat-close aria-label=\"Close chat\" title=\"Close chat\">×</button></div>" +
      "<details class=\"aikb-chat__settings\"><summary>Model settings</summary><label>Ollama URL<input name=\"chat-endpoint\" type=\"url\" value=\"" +
      escapeHtml(config.endpoint) +
      "\"></label><label>Model<input name=\"chat-model\" value=\"" +
      escapeHtml(config.model) +
      "\"></label><button type=\"button\" data-chat-save-settings>Save settings</button></details>" +
      "<div class=\"aikb-chat__suggestions\"><button type=\"button\" data-chat-prompt=\"Explain the core idea in simpler terms.\">Explain simply</button><button type=\"button\" data-chat-prompt=\"What are the main engineering tradeoffs?\">Compare tradeoffs</button><button type=\"button\" data-chat-prompt=\"Quiz me on the most important concepts.\">Quiz me</button></div>" +
      "<div class=\"aikb-chat__messages\" role=\"log\" aria-live=\"polite\"></div>" +
      "<p class=\"aikb-chat__status\" aria-live=\"polite\"></p>" +
      "<form class=\"aikb-chat__form\"><textarea name=\"chat-question\" rows=\"3\" placeholder=\"Ask about this page…\" required></textarea><div><small>Enter to send · Shift+Enter for a new line</small><button type=\"submit\">Send</button></div></form>";
    renderChatMessages(panel, reader, messages);

    var form = panel.querySelector(".aikb-chat__form");
    var textarea = form.querySelector("textarea");
    var status = panel.querySelector(".aikb-chat__status");
    var submit = form.querySelector("button[type='submit']");
    function submitQuestion(question) {
      question = clean(question);
      if (!question || submit.disabled) {
        return;
      }
      config = chatConfig();
      messages.push({ role: "user", content: question });
      messages.push({ role: "assistant", content: "" });
      renderChatMessages(panel, reader, messages);
      submit.disabled = true;
      textarea.disabled = true;
      status.textContent = "Reading the most relevant sections…";
      var context = retrieveChatContext(reader, question);
      var requestMessages = [
        {
          role: "system",
          content:
            "You are a concise learning guide for the current documentation page. Answer only from the supplied context. If the context is insufficient, say what is missing. Cite section names in plain text. Explain relationships and tradeoffs; do not invent APIs or facts.\n\nPAGE CONTEXT\n" +
            context,
        },
      ].concat(
        messages.slice(0, -1).slice(-8).map(function (message) {
          return { role: message.role, content: message.content };
        })
      );
      var answer = "";
      streamOllamaChat(
        config,
        requestMessages,
        function (token) {
          answer += token;
          messages[messages.length - 1].content = answer;
          renderChatMessages(panel, reader, messages);
          status.textContent = "Generating with " + config.model + "…";
        },
        new AbortController().signal
      )
        .then(function () {
          if (!answer) {
            throw new Error("The model returned an empty response.");
          }
          savePageChatHistory(messages);
          status.textContent = "Answer grounded in this page.";
        })
        .catch(function (error) {
          messages.pop();
          savePageChatHistory(messages);
          renderChatMessages(panel, reader, messages);
          status.textContent =
            error.name === "AbortError"
              ? "Generation stopped."
              : "Could not reach Ollama. Start Ollama, pull " +
                config.model +
                ", and allow this site's origin. " +
                error.message;
        })
        .finally(function () {
          submit.disabled = false;
          textarea.disabled = false;
          textarea.value = "";
          textarea.focus();
        });
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitQuestion(textarea.value);
    });
    textarea.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    panel.querySelectorAll("[data-chat-prompt]").forEach(function (button) {
      button.addEventListener("click", function () {
        textarea.value = button.dataset.chatPrompt;
        submitQuestion(textarea.value);
      });
    });
    panel.querySelector("[data-chat-close]").addEventListener("click", function () {
      panel.dataset.open = "false";
    });
    panel.querySelector("[data-chat-save-settings]").addEventListener("click", function () {
      var endpoint = clean(panel.querySelector("[name='chat-endpoint']").value);
      var model = clean(panel.querySelector("[name='chat-model']").value);
      if (!/^https?:\/\//.test(endpoint) || !model) {
        status.textContent = "Enter a valid HTTP Ollama URL and model name.";
        return;
      }
      var state = chatState();
      state.endpoint = endpoint;
      state.model = model;
      saveChatState(state);
      status.textContent = "Model settings saved.";
      panel.querySelector(".aikb-chat__header small").textContent = "Local · " + model;
    });
    panel.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-chat-section]");
      if (!sectionButton) {
        return;
      }
      var target = Array.prototype.slice.call(reader.querySelectorAll("h2, h3")).find(
        function (heading) {
          return clean(heading.textContent.replace(/[¶#]/g, "")) === sectionButton.dataset.chatSection;
        }
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("aikb-knowledge-focus");
        window.setTimeout(function () {
          target.classList.remove("aikb-knowledge-focus");
        }, 2200);
      }
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
      "<button class=\"aikb-notes-top\" type=\"button\" data-notes-open>Notes</button>" +
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
      toolButton("chat", "chat", "Learning Chat") +
      "</div><div class=\"aikb-study-panel__output\" aria-live=\"polite\"></div><div class=\"aikb-chat-panel\" aria-live=\"polite\"></div><div class=\"aikb-notes-panel\" aria-live=\"polite\"></div></aside>";

    root.innerHTML = "";
    root.appendChild(appHeader);
    root.appendChild(workspace);

    var reader = workspace.querySelector(".aikb-reader");
    children.forEach(function (child) {
      reader.appendChild(child);
    });

    var sourceList = workspace.querySelector(".aikb-source-list");
    var sources = sourceItems(reader);
    if (sources.length) {
      sourceList.innerHTML = sources
        .map(function (source) {
          return (
            "<a class=\"aikb-source-item\" href=\"" +
            escapeHtml(source.href) +
            "\" data-source-href=\"" +
            escapeHtml(source.href) +
            "\" data-source-label=\"" +
            escapeHtml(source.label) +
            "\" data-source-type=\"" +
            escapeHtml(source.type) +
            "\" rel=\"noreferrer\">" +
            "<span>" +
            icon("doc") +
            "</span><div><strong>" +
            escapeHtml(source.label) +
            "</strong><small>" +
            escapeHtml(source.description) +
            "</small></div><span class=\"aikb-source-action\">View</span></a>"
          );
        })
        .join("");
      populateSourceDescriptions(sourceList, sources);
    } else {
      sourceList.innerHTML =
        "<div class=\"aikb-source-empty\"><strong>No external sources cited yet</strong><span>This page is local handbook content. Add primary links in the article to populate this panel.</span></div>";
    }

    var output = workspace.querySelector(".aikb-study-panel__output");
    var chatPanel = workspace.querySelector(".aikb-chat-panel");
    var topicHtml = reader.innerHTML;

    workspace.addEventListener("click", function (event) {
      var sourceLink = event.target.closest(".aikb-source-item");
      if (sourceLink) {
        event.preventDefault();
        renderSourcePreview(reader, topicHtml, {
          href: sourceLink.dataset.sourceHref,
          label: sourceLink.dataset.sourceLabel,
          type: sourceLink.dataset.sourceType,
        });
        return;
      }

      var cardMenu = event.target.closest("[data-card-menu]");
      if (cardMenu) {
        event.preventDefault();
        event.stopPropagation();
        var menu = cardMenu.parentElement.querySelector(".aikb-card-menu__items");
        var wasHidden = menu.hidden;
        closeCardMenus(workspace);
        menu.hidden = !wasHidden;
        return;
      }

      if (!event.target.closest(".aikb-card-menu")) {
        closeCardMenus(workspace);
      }

      if (event.target.closest("[data-notes-open]")) {
        renderNotesPanel();
        return;
      }

      if (event.target.closest("[data-note-new]")) {
        createManualNote(pageTitle(reader));
        return;
      }

      if (event.target.closest("[data-google-docs-export]")) {
        exportNotesToGoogleDocs();
        return;
      }

      var notesClose = event.target.closest("[data-notes-close]");
      if (notesClose) {
        workspace.querySelector(".aikb-notes-panel").dataset.open = "false";
        return;
      }

      var addCardNote = event.target.closest("[data-card-add-note]");
      if (addCardNote) {
        event.preventDefault();
        event.stopPropagation();
        var noteRoot = addCardNote.closest(".aikb-study-card");
        var saved = addNote({
          title: noteRoot.dataset.title,
          content: noteRoot.dataset.content,
          category: pageTitle(reader),
          source: pageTitle(reader),
        });
        if (saved) {
          markCardSaved(noteRoot);
        }
        closeCardMenus(workspace);
        return;
      }

      var listenCard = event.target.closest("[data-card-listen]");
      if (listenCard) {
        event.preventDefault();
        event.stopPropagation();
        var listenRoot = listenCard.closest(".aikb-study-card");
        speak(listenRoot.dataset.content || "");
        closeCardMenus(workspace);
        return;
      }

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
      chatPanel.dataset.open = "false";
      if (tool === "quiz") {
        renderQuiz(reader, output);
      } else if (tool === "flashcards") {
        renderFlashcards(reader, output);
        syncSavedCards(output, pageTitle(reader));
      } else if (tool === "audio") {
        renderAudio(reader, output);
      } else if (tool === "mindmap") {
        renderMindMap(reader, output, sources, topicHtml);
      } else if (tool === "guide") {
        renderGuide(reader, output);
      } else if (tool === "chat") {
        output.dataset.open = "false";
        renderChatPanel(chatPanel, reader);
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
