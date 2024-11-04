const title = document.getElementsByName("title")[0].innerText;

const textBox = document.createElement("div");
textBox.innerText = "Sentiment loading...";
textBox.style.position = "fixed";
textBox.style.bottom = "20px";
textBox.style.right = "20px";
textBox.style.padding = "10px 15px";
textBox.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
textBox.style.color = "#fff";
textBox.style.borderRadius = "5px";
textBox.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.5)";
textBox.style.zIndex = "1000";
textBox.style.display = "block";
document.body.appendChild(textBox);

const toggleSwitch = document.createElement("span");
toggleSwitch.innerHTML = "<b>Sentiment</b> | Bias";
toggleSwitch.style.cursor = "pointer";
toggleSwitch.style.marginLeft = "10px";
toggleSwitch.style.color = "#61dafb";

let mode = "sentiment";
let sentimentState = null;
let sentimentText = "";
let biasState = null;
let biasText = "";


document.body.classList.add("hide-bias");

function calculateHighlightState(searchTexts, tooltips, types) {
    const paragraphs = document.querySelectorAll("p");
    const result = [];

    paragraphs.forEach(paragraph => {
        const clone = paragraph.cloneNode(true);
        const supMap = new Map();
        const sups = clone.querySelectorAll("sup");

        let currentTextBefore = '';
        let currentSupHTML = '';
        let previousSup = null;

        sups.forEach((sup, index) => {
            let textBefore = '';
            let prevNode = sup.previousSibling;

            while (prevNode && textBefore.length < 10) {
                if (prevNode.nodeType === Node.TEXT_NODE) {
                    textBefore = prevNode.textContent.slice(-10) + textBefore;
                } else if (prevNode.nodeType === Node.ELEMENT_NODE) {
                    textBefore = prevNode.textContent.slice(-10) + textBefore;
                }
                prevNode = prevNode.previousSibling;
            }

            if (!previousSup || previousSup.nextSibling !== sup) {
                if (currentSupHTML) {
                    supMap.set(currentSupHTML, currentTextBefore);
                }
                currentTextBefore = textBefore.slice(-10);
                currentSupHTML = '';
            }

            currentSupHTML += sup.outerHTML;
            previousSup = sup;

            if (index === sups.length - 1 || sups[index + 1].previousSibling !== sup) {
                supMap.set(currentSupHTML, currentTextBefore);
                currentSupHTML = '';
            }
        });

        sups.forEach(sup => sup.remove());

        const linkMap = new Map();
        paragraph.querySelectorAll("a").forEach(anchor => {
            linkMap.set(anchor.innerText, anchor.outerHTML);
        });

        const normalizedParagraphText = clone.textContent.replace(/\s+/g, ' ');
        let modifiedHTML = normalizedParagraphText;

        searchTexts.forEach((text, index) => {
            const tooltipText = tooltips[index];
            const normalizedSearchText = text.replace(/\s+/g, ' ');

            if (normalizedParagraphText.includes(normalizedSearchText)) {
                const startIndex = modifiedHTML.indexOf(normalizedSearchText);
                const endIndex = startIndex + normalizedSearchText.length;

                modifiedHTML =
                    modifiedHTML.slice(0, startIndex) +
                    `<span class="${types[index]}-highlighted" title="${tooltipText}">${normalizedSearchText}</span>` +
                    modifiedHTML.slice(endIndex);
            }
        });

        linkMap.forEach((outer, inner) => {
            modifiedHTML = modifiedHTML.replace(inner, outer);
        });

        supMap.forEach((textBefore, supHTML) => {
            const index = modifiedHTML.indexOf(textBefore);
            if (index !== -1) {
                const beforeText = modifiedHTML.slice(0, index + textBefore.length);
                const afterText = modifiedHTML.slice(index + textBefore.length);
                modifiedHTML = `${beforeText}${supHTML}${afterText}`;
            }
        });

        result.push(modifiedHTML);
    });

    return result;
}

function applyState(state) {
    const paragraphs = document.querySelectorAll("p");
    paragraphs.forEach((paragraph, index) => {
        paragraph.innerHTML = state[index];
    });
}

toggleSwitch.addEventListener("click", () => {
    mode = mode === "sentiment" ? "bias" : "sentiment";
    toggleSwitch.innerHTML = mode === "sentiment" ? "<b>Sentiment</b> | Bias" : "Sentiment | <b>Bias</b>";

    if (mode === "sentiment") {
        document.body.classList.add("hide-bias");
        document.body.classList.remove("hide-sentiment");
        textBox.innerText = sentimentText;
        textBox.style.color = sentimentText.includes("positive") ? "rgba(55,255,0,0.53)": "rgba(255,0,0,0.53)";
        applyState(sentimentState);
    } else {
        document.body.classList.add("hide-sentiment");
        document.body.classList.remove("hide-bias");
        textBox.innerText = biasText;
        textBox.style.color = biasText.includes("left") ? "#009dff": "#f947ff" ;
        applyState(biasState);
    }
    textBox.appendChild(toggleSwitch);
});


fetch("https://wikibias.skyler.cc/sentiment", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: title })
})
    .then(response => response.json())
    .then((data) => {
        let findings = data.sentiment;
        let searchTexts = findings.map(finding => finding.text);
        let tooltips = findings.map(finding => `We are ${Math.floor(finding.confidence * 100)}% confident that this text is biased in a ${finding.type} direction.`);
        let types = findings.map(finding => finding.type);
        let page = data.page;

        sentimentText = `${Math.floor(page.confidence * 100)}% ${page.type}`;
        sentimentState = calculateHighlightState(searchTexts, tooltips, types);
        applyState(sentimentState); // Apply sentiment state immediately as default

        textBox.innerText = "Got sentiment. Loading bias...";

        return fetch("https://wikibias.skyler.cc/bias", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: title })
        });
    })
    .then(response => response.json())
    .then((data) => {
        let findings = data.bias;
        let searchTexts = findings.map(finding => finding.text);
        let tooltips = findings.map(finding => `We are ${Math.floor(finding.confidence * 100)}% confident that this text is ${finding.type} leaning.`);
        let types = findings.map(finding => finding.type);
        let page = data.page;

        biasState = calculateHighlightState(searchTexts, tooltips, types);
        biasText = `${Math.floor(page.confidence * 100)}% ${page.type}`;

        textBox.style.color = sentimentText.includes("positive") ? "#37FF0084": "#FF000084";
        textBox.innerText = sentimentText;
        textBox.appendChild(toggleSwitch);
    })
    // .catch(error => console.error("Error:", error));