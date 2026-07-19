document.addEventListener("DOMContentLoaded", function () {
    // DOM refs
    const usernameInput = document.getElementById("user-input");
    const searchBtn = document.getElementById("search-btn");

    const easyCircle = document.getElementById("easy-circle");
    const mediumCircle = document.getElementById("medium-circle");
    const hardCircle = document.getElementById("hard-circle");
    const easyLabel = document.getElementById("easy-label");
    const mediumLabel = document.getElementById("medium-label");
    const hardLabel = document.getElementById("hard-label");

    const totalSubmissionsEl = document.getElementById("total-submissions");
    const totalSolvedEl = document.getElementById("total-solved");
    const totalAttemptedEl = document.getElementById("total-attempted");
    const acceptanceRateEl = document.getElementById("acceptance-rate");

    const questionList = document.getElementById("question-list");
    const questionTitle = document.getElementById("question-title");

    function validateUsername(username) {
        if (username.trim() === "") {
            alert("Username cannot be empty.");
            return false;
        }
        if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username)) {
            alert("Invalid format: 1–20 characters allowed (letters, numbers, underscores, dashes).");
            return false;
        }
        return true;
    }

    // ----- Official LeetCode GraphQL Fetcher (Stats + Recent Solved Questions) -----
    async function fetchLeetCodeData(username) {
        const proxyUrl = "https://corsproxy.io/?";
        const targetUrl = "https://leetcode.com/graphql/";
        
        // Combined query requesting user stats AND recent accepted submissions together
        const graphql = JSON.stringify({
            query: `
                query userFullDashboard($username: String!) {
                  allQuestionsCount { difficulty count }
                  matchedUser(username: $username) {
                    submitStats {
                      acSubmissionNum { difficulty count submissions }
                      totalSubmissionNum { difficulty count submissions }
                    }
                  }
                  recentAcSubmissionList(username: $username, limit: 20) {
                    title
                    titleSlug
                  }
                }
            `,
            variables: { username },
        });

        const resp = await fetch(proxyUrl + targetUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: graphql,
        });
        
        if (!resp.ok) throw new Error("LeetCode API error");
        const data = await resp.json();
        if (data.errors) throw new Error(data.errors[0].message);
        
        const qs = data.data.allQuestionsCount;
        const user = data.data.matchedUser;
        if (!user) throw new Error("User not found on LeetCode");
        
        const ac = user.submitStats.acSubmissionNum;
        const total = user.submitStats.totalSubmissionNum;
        
        // Extract recent submissions array cleanly from the primary payload
        const rawSubmissions = data.data.recentAcSubmissionList || [];

        return {
            username,
            easySolved: ac.find((d) => d.difficulty === "Easy")?.count || 0,
            easyTotal: qs.find((d) => d.difficulty === "Easy")?.count || 0,
            mediumSolved: ac.find((d) => d.difficulty === "Medium")?.count || 0,
            mediumTotal: qs.find((d) => d.difficulty === "Medium")?.count || 0,
            hardSolved: ac.find((d) => d.difficulty === "Hard")?.count || 0,
            hardTotal: qs.find((d) => d.difficulty === "Hard")?.count || 0,
            totalSubmissions: total.find((d) => d.difficulty === "All")?.submissions || 0,
            totalSolved: ac.find((d) => d.difficulty === "All")?.count || 0,
            totalAttempted: total.find((d) => d.difficulty === "All")?.count || 0,
            acceptanceRate: total.find((d) => d.difficulty === "All")?.submissions > 0 ? 
                (ac.find((d) => d.difficulty === "All")?.count / total.find((d) => d.difficulty === "All")?.submissions) * 100 : 0,
            solvedQuestions: rawSubmissions
        };
    }

    // ----- Display Layout Rendering -----
    function displayStats(data) {
        // Calculate percentages for structural circular bars
        const easyPct = data.easyTotal > 0 ? (data.easySolved / data.easyTotal) * 100 : 0;
        const mediumPct = data.mediumTotal > 0 ? (data.mediumSolved / data.mediumTotal) * 100 : 0;
        const hardPct = data.hardTotal > 0 ? (data.hardSolved / data.hardTotal) * 100 : 0;

easyCircle.style.setProperty("--progress-degree", (easyPct * 3.6));
mediumCircle.style.setProperty("--progress-degree", (mediumPct * 3.6));
hardCircle.style.setProperty("--progress-degree", (hardPct * 3.6));

        easyLabel.textContent = `${data.easySolved}/${data.easyTotal}`;
        mediumLabel.textContent = `${data.mediumSolved}/${data.mediumTotal}`;
        hardLabel.textContent = `${data.hardSolved}/${data.hardTotal}`;

        totalSubmissionsEl.textContent = data.totalSubmissions.toLocaleString();
        totalSolvedEl.textContent = data.totalSolved.toLocaleString();
        totalAttemptedEl.textContent = data.totalAttempted.toLocaleString();

        const rate = data.acceptanceRate !== undefined ? data.acceptanceRate : 0;
        acceptanceRateEl.textContent = rate.toFixed(1) + "%";

        // Filter and display the unique question items natively
        const uniqueQuestions = [];
        const seenTitles = new Set();
        
        for (const q of data.solvedQuestions) {
            if (!seenTitles.has(q.title)) {
                seenTitles.add(q.title);
                uniqueQuestions.push(q);
            }
        }

        showQuestions("Recently Solved Problems", uniqueQuestions);
    }

    function showQuestions(title, questions) {
        questionTitle.innerHTML = `
            <i class="fas fa-list-ul"></i> ${title} 
            <span class="count-badge">${questions.length}</span>
        `;
        
        if (questions.length === 0) {
            questionList.innerHTML = `
                <li class="empty-state">
                    <i class="fas fa-inbox"></i> No public solved questions found or profile private.
                </li>
            `;
            return;
        }

        questionList.innerHTML = questions.map((q) => {
            const link = `https://leetcode.com/problems/${q.titleSlug}/`;
            return `
                <li>
                    <a href="${link}" target="_blank">
                        <i class="fas fa-code q-icon"></i>
                        ${q.title}
                    </a>
                </li>
            `;
        }).join('');
    }

    // ----- Executing Event Flow -----
    async function performSearch() {
        const username = usernameInput.value.trim();

        if (!validateUsername(username)) return;

        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

        try {
            const data = await fetchLeetCodeData(username);
            displayStats(data);
        } catch (err) {
            alert(err.message || "Failed to fetch user data.");
            // Reset layout
            easyLabel.textContent = "0/0";
            mediumLabel.textContent = "0/0";
            hardLabel.textContent = "0/0";
            easyCircle.style.setProperty("--progress-degree", "0%");
            mediumCircle.style.setProperty("--progress-degree", "0%");
            hardCircle.style.setProperty("--progress-degree", "0%");
            totalSubmissionsEl.textContent = "—";
            totalSolvedEl.textContent = "—";
            totalAttemptedEl.textContent = "—";
            acceptanceRateEl.textContent = "—";
            questionList.innerHTML = `<li class="empty-state"><i class="fas fa-exclamation-triangle"></i> ${err.message}</li>`;
            questionTitle.innerHTML = `<i class="fas fa-list-ul"></i> Error <span class="count-badge">0</span>`;
        } finally {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
        }
    }

    searchBtn.addEventListener("click", performSearch);
    usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") performSearch(); });

    // Initial Interface Setup
    questionList.innerHTML = `
        <li class="empty-state">
            <i class="fas fa-search"></i> Enter a LeetCode username and click Search
        </li>
    `;
    usernameInput.value = "";
});