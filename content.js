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
// toggleSwitch.style.fontWeight = "bold";

let mode = "sentiment";

document.body.classList.add("hide-bias");

toggleSwitch.addEventListener("click", () => {
    mode = mode === "sentiment" ? "bias" : "sentiment";
    toggleSwitch.innerHTML = mode === "sentiment" ? "<b>Sentiment</b> | Bias" : "Sentiment | <b>Bias</b>";

    // Toggle body class based on mode
    if (mode === "sentiment") {
        document.body.classList.add("hide-bias");
        document.body.classList.remove("hide-sentiment");
    } else {
        document.body.classList.add("hide-sentiment");
        document.body.classList.remove("hide-bias");
    }
});

const title = document.getElementsByName("title")[0].innerText;

function highlight(searchTexts, tooltips, types) {
    const paragraphs = document.querySelectorAll("p");

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

            // Capture up to 10 characters before the first <sup> in a sequence
            while (prevNode && textBefore.length < 10) {
                if (prevNode.nodeType === Node.TEXT_NODE) {
                    textBefore = prevNode.textContent.slice(-10) + textBefore;
                } else if (prevNode.nodeType === Node.ELEMENT_NODE) {
                    textBefore = prevNode.textContent.slice(-10) + textBefore;
                }
                prevNode = prevNode.previousSibling;
            }

            // If this is the start of a new sequence, initialize current values
            if (!previousSup || previousSup.nextSibling !== sup) {
                if (currentSupHTML) {
                    // Store the previous sequence in supMap
                    supMap.set(currentSupHTML, currentTextBefore);
                }
                currentTextBefore = textBefore.slice(-10);
                currentSupHTML = '';
            }

            // Append the current <sup> to the current sequence
            currentSupHTML += sup.outerHTML;
            previousSup = sup;

            // If this is the last <sup> or the next one is not consecutive, add to map
            if (index === sups.length - 1 || sups[index + 1].previousSibling !== sup) {
                supMap.set(currentSupHTML, currentTextBefore);
                currentSupHTML = '';
            }
        });

        // Remove <sup> tags from the clone paragraph
        sups.forEach(sup => sup.remove());

        const linkMap = new Map();
        paragraph.querySelectorAll("a").forEach(anchor => {
            linkMap.set(anchor.innerText, anchor.outerHTML);
        });

        // Normalize whitespace in the clone's paragraph text
        const normalizedParagraphText = clone.textContent.replace(/\s+/g, ' ');

        // Highlight search terms in the paragraph
        searchTexts.forEach((text, index) => {
            const tooltipText = tooltips[index];
            const normalizedSearchText = text.replace(/\s+/g, ' ');

            // Check if normalized search text exists in the paragraph
            if (normalizedParagraphText.includes(normalizedSearchText)) {
                const startIndex = normalizedParagraphText.indexOf(normalizedSearchText);
                const endIndex = startIndex + normalizedSearchText.length;
                console.log(types)
                paragraph.innerHTML =
                    normalizedParagraphText.slice(0, startIndex) +
                    `<span class="${types[index]}-highlighted" title="${tooltipText}">${normalizedSearchText}</span>` +
                    normalizedParagraphText.slice(endIndex);
            }
        });

        // Restore anchor tags
        linkMap.forEach((outer, inner) => {
            paragraph.innerHTML = paragraph.innerHTML.replace(inner, outer);
        });

        // Reinsert <sup> tags with combined entries
        let modifiedHTML = paragraph.innerHTML;
        supMap.forEach((textBefore, supHTML) => {
            const index = modifiedHTML.indexOf(textBefore);

            if (index !== -1) {
                const beforeText = modifiedHTML.slice(0, index + textBefore.length);
                const afterText = modifiedHTML.slice(index + textBefore.length);
                modifiedHTML = `${beforeText}${supHTML}${afterText}`;
            }
        });

        paragraph.innerHTML = modifiedHTML;
    });
}



fetch("https://wiki.skyler.cc/sentiment", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: title })
})
    .then(response => response.json())
    .then((data) => {
        let findings = data.findings;
        let searchTexts = findings.map(finding => finding.text);
        let tooltips = findings.map(finding => `We are ${Math.floor(finding.confidence * 100)}% confident that this text is ${finding.type}`);
        let types = findings.map(finding => finding.type);
        highlight(searchTexts, tooltips, types);
        textBox.innerText = "Got sentiment. Loading bias...";

        // Chain the second fetch call
        return fetch("https://wiki.skyler.cc/bias", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: title })
        });
    })
    .then(response => response.json())
    .then((data) => {
        let findings = data.findings;
        let searchTexts = findings.map(finding => finding.text);
        let tooltips = findings.map(finding => `We are ${Math.floor(finding.confidence * 100)}% confident that this text is ${finding.type}`);
        let types = findings.map(finding => finding.type);

        highlight(searchTexts, tooltips, types);
        textBox.innerText = "";
        textBox.appendChild(toggleSwitch);
    })
    .catch(error => console.error("Error:", error));
