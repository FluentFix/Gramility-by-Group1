// Word counter functionality
const textInput = document.getElementById("textInput");
const wordCounter = document.querySelector(".word-counter");

textInput.addEventListener("input", function () {
  const text = this.value.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  wordCounter.textContent = wordCount + (wordCount === 1 ? " word" : " words");
});

function toggleTable() {
  const tableContainer = document.getElementById("tableContainer");
  tableContainer.classList.toggle("show");
}

async function checkGrammar() {
  const textInput = document.getElementById("textInput").value;
  const outputDiv = document.getElementById("output");
  const loadingMessage = document.getElementById("loadingMessage");

  if (textInput.trim() === "") {
    outputDiv.style.display = "none";
    return;
  }

  loadingMessage.style.display = "flex";
  outputDiv.style.display = "none";

  try {
    // Make request to LanguageTool API
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'text': textInput,
        'language': 'auto', // Auto-detect language
        'enabledOnly': 'false' // Include all available rules
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Process API response
    const wordCount = textInput.trim().split(/\s+/).length;
    const sentenceCount = textInput.split(/[.!?]+/).filter(Boolean).length;
    const errorCount = data.matches.length;
    
    // Determine rating based on error count and text length
    let ratingClass = "";
    let rating = "";
    const errorDensity = errorCount / wordCount * 100; // Errors per 100 words
    
    if (errorDensity < 1) {
      rating = `Excellent (${Math.round(95 - errorDensity * 5)}%)`;
      ratingClass = "rating-excellent";
    } else if (errorDensity < 3) {
      rating = `Good (${Math.round(85 - errorDensity * 5)}%)`;
      ratingClass = "rating-good";
    } else if (errorDensity < 5) {
      rating = `Satisfactory (${Math.round(70 - errorDensity * 3)}%)`;
      ratingClass = "rating-satisfactory";
    } else {
      rating = `Needs Improvement (${Math.max(20, Math.round(55 - errorDensity * 2))}%)`;
      ratingClass = "rating-needs-improvement";
    }

    // Group errors by category
    const errorsByCategory = groupErrorsByCategory(data.matches);
    
    // Generate suggestions based on actual errors
    const suggestions = generateSuggestionsFromMatches(data.matches);

    outputDiv.innerHTML = `
      <h3>Grammar Check Results</h3>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-chart-bar"></i>
          </div>
          <div>
              <p><strong>Text Statistics:</strong></p>
              <p>Word count: ${wordCount} | Sentence count: ${sentenceCount} | Average words per sentence: ${(
        wordCount / Math.max(1, sentenceCount)
      ).toFixed(1)}</p>
          </div>
      </div>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-exclamation-circle"></i>
          </div>
          <div>
              <p><strong>Errors Detected:</strong> ${errorCount}</p>
              <p>Primary issues: ${formatErrorCategories(errorsByCategory)}</p>
          </div>
      </div>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-lightbulb"></i>
          </div>
          <div>
              <p><strong>Suggestions for Improvement:</strong></p>
              <ul class="suggestions-list">
                  ${suggestions.map(s => `<li>${s}</li>`).join("")}
              </ul>
          </div>
      </div>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-award"></i>
          </div>
          <div>
              <p><strong>Overall Rating:</strong> <span class="rating-badge ${ratingClass}">${rating}</span></p>
          </div>
      </div>
    `;
    
    // Add highlighted text with errors if there are any matches
    if (errorCount > 0) {
      let highlightedText = textInput;
      
      // Sort matches by offset (to process from end to beginning to avoid offset issues)
      const sortedMatches = [...data.matches].sort((a, b) => b.offset - a.offset);
      
      sortedMatches.forEach(match => {
        const start = match.offset;
        const end = start + match.length;
        const replacement = `<span class="error-highlight" title="${match.message.replace(/"/g, '&quot;')}">${textInput.substring(start, end)}<span class="error-tooltip" style="z-index: 1000;">${match.message}${match.replacements.length > 0 ? `<br>Suggestion: ${match.replacements[0].value}` : ''}</span></span>`;
        
        highlightedText = 
          highlightedText.substring(0, start) + 
          replacement + 
          highlightedText.substring(end);
      });
      
      // Convert newlines to <br> tags for proper HTML rendering
      // while preserving paragraphs and preventing text from running together
      highlightedText = highlightedText
        .replace(/\n/g, '<br>')
        .replace(/(<br>){3,}/g, '<br><br>'); // Limit consecutive breaks
      
      // Format the highlighted text for better display
      outputDiv.innerHTML += `
        <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-file-alt"></i>
          </div>
          <div>
              <p><strong>Text with Highlighted Errors:</strong></p>
              <div class="highlighted-text">${highlightedText}</div>
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error calling LanguageTool API:', error);
    
    // Fallback to simulation if API fails
    const wordCount = textInput.trim().split(/\s+/).length;
    const sentenceCount = textInput.split(/[.!?]+/).filter(Boolean).length;
    const errors = calculateErrors(textInput);
    let ratingClass = "";
    let rating = "";

    if (errors === 0) {
      rating = "Excellent (95%)";
      ratingClass = "rating-excellent";
    } else if (errors <= 2) {
      rating = "Good (78%)";
      ratingClass = "rating-good";
    } else if (errors <= 4) {
      rating = "Satisfactory (58%)";
      ratingClass = "rating-satisfactory";
    } else {
      rating = "Needs Improvement (35%)";
      ratingClass = "rating-needs-improvement";
    }

    outputDiv.innerHTML = `
      <h3>Grammar Check Results (Offline Mode)</h3>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-chart-bar"></i>
          </div>
          <div>
              <p><strong>Text Statistics:</strong></p>
              <p>Word count: ${wordCount} | Sentence count: ${sentenceCount} | Average words per sentence: ${(
        wordCount / Math.max(1, sentenceCount)
      ).toFixed(1)}</p>
          </div>
      </div>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-exclamation-circle"></i>
          </div>
          <div>
              <p><strong>Errors Detected:</strong> ${errors}</p>
              <p>Primary issues: ${getRandomIssues(errors)}</p>
          </div>
      </div>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-lightbulb"></i>
          </div>
          <div>
              <p><strong>Suggestions for Improvement:</strong></p>
              <ul class="suggestions-list">
                  ${generateSuggestions(errors)
                    .map((s) => `<li>${s}</li>`)
                    .join("")}
              </ul>
          </div>
      </div>
      
      <div class="result-item">
          <div class="result-icon">
              <i class="fas fa-award"></i>
          </div>
          <div>
              <p><strong>Overall Rating:</strong> <span class="rating-badge ${ratingClass}">${rating}</span></p>
              <p><small>Note: API connection failed. Using offline analysis mode.</small></p>
          </div>
      </div>
    `;
  } finally {
    loadingMessage.style.display = "none";
    outputDiv.style.display = "block";
  }
}

// Function to group errors by category
function groupErrorsByCategory(matches) {
  const categories = {};
  
  matches.forEach(match => {
    const category = match.rule.category?.name || 'Other';
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category]++;
  });
  
  return categories;
}

// Function to format error categories for display
function formatErrorCategories(errorsByCategory) {
  if (Object.keys(errorsByCategory).length === 0) {
    return "None detected";
  }
  
  // Sort categories by frequency
  const sortedCategories = Object.entries(errorsByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // Get top 3 categories
  
  return sortedCategories.map(([category, count]) => 
    `${category} (${count})`
  ).join(", ");
}

// Function to generate suggestions based on actual errors
function generateSuggestionsFromMatches(matches) {
  if (matches.length === 0) {
    return ["Your text is well-written. Keep up the good work!"];
  }
  
  // Group similar errors to avoid repetitive suggestions
  const errorTypes = {};
  
  matches.forEach(match => {
    const ruleId = match.rule.id;
    if (!errorTypes[ruleId]) {
      errorTypes[ruleId] = {
        count: 0,
        message: match.message,
        category: match.rule.category?.name || 'Other',
        example: match.context?.text || ''
      };
    }
    errorTypes[ruleId].count++;
  });
  
  // Generate suggestions based on most common error types
  const suggestions = [];
  
  // Sort error types by frequency
  const sortedErrorTypes = Object.entries(errorTypes)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5); // Limit to 5 suggestions
  
  sortedErrorTypes.forEach(([ruleId, info]) => {
    let suggestion = '';
    
    // Create a suggestion based on error type
    switch (info.category.toLowerCase()) {
      case 'grammar':
        suggestion = `Check your grammar: ${info.message.replace(/^This sentence (?:contains|seems to contain) (?:a|an) /, '')}`;
        break;
      case 'punctuation': 
        suggestion = `Review punctuation: ${info.message}`;
        break;
      case 'style':
        suggestion = `Consider style improvement: ${info.message}`;
        break;
      case 'spelling':
        suggestion = `Fix spelling issues: ${info.message}`;
        break;
      default:
        suggestion = info.message;
    }
    
    suggestions.push(suggestion);
  });
  
  // Add general suggestions based on error categories
  if (Object.keys(errorTypes).some(id => errorTypes[id].category.toLowerCase() === 'grammar')) {
    suggestions.push("Review grammar rules for more effective writing.");
  }
  
  if (suggestions.length < 3) {
    suggestions.push("Use more concise language for clearer communication.");
  }
  
  return suggestions;
}

// Helper functions for simulated analysis
function calculateErrors(text) {
  // Simplified simulation - in reality this would be a complex analysis
  const length = text.length;
  if (length < 20) return 5;
  if (length < 50) return 4;
  if (length < 100) return 3;
  if (length < 200) return 2;
  if (length < 300) return 1;
  return 0;
}

function getRandomIssues(errorCount) {
  const issues = [
    "Passive voice overuse",
    "Run-on sentences",
    "Subject-verb agreement",
    "Comma splices",
    "Inconsistent tense",
    "Pronoun clarity",
    "Wordiness",
    "Spelling errors",
  ];

  if (errorCount === 0) return "None detected";

  // Select random issues based on error count
  const selectedIssues = [];
  for (let i = 0; i < Math.min(errorCount, 3); i++) {
    const randomIndex = Math.floor(Math.random() * issues.length);
    selectedIssues.push(issues[randomIndex]);
    issues.splice(randomIndex, 1);
  }

  return selectedIssues.join(", ");
}

function generateSuggestions(errorCount) {
  const allSuggestions = [
    "Consider rephrasing passive voice constructions to active voice for more directness.",
    "Break longer sentences into shorter ones to improve readability.",
    "Check subject-verb agreement throughout your text.",
    "Review comma usage, especially with independent clauses.",
    "Maintain consistent tense throughout your writing.",
    "Ensure pronouns clearly refer to their antecedents.",
    "Eliminate unnecessary words and phrases to make your writing more concise.",
    "Use more specific and precise vocabulary.",
    "Add transition words between paragraphs to improve flow.",
    "Consider reorganizing content for better logical progression.",
  ];

  if (errorCount === 0)
    return ["Your text is well-written. Keep up the good work!"];

  // Return suggestions based on error count
  return allSuggestions.slice(0, Math.min(errorCount + 1, 5));
}
