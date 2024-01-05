const axios = require('axios');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs').promises;

const githubToken = process.env.GITHUB_TOKEN;
if(!githubToken) {
    throw new Error('GITHUB_TOKEN is not set')
}
const dbPath = path.join(__dirname, 'github_repos.db');

const repositories = [
    { url: "https://wails.io", github: "https://github.com/wailsapp/wails", dependencies: "Go, Web Technologies" },
    { url: "https://fyne.io", github: "https://github.com/fyne-io/fyne", dependencies: "Go" },
    { url: "https://github.com/zserge/lorca", github: "https://github.com/zserge/lorca", dependencies: "Go, Chrome" },
    { url: "https://github.com/asticode/go-astilectron", github: "https://github.com/asticode/go-astilectron", dependencies: "Go, Electron" },
    { url: "https://gioui.org", github: "https://github.com/gioui/gio", dependencies: "Go" },
    { url: "https://github.com/webview/webview", github: "https://github.com/webview/webview", dependencies: "Go, C/C++" },
    { url: "https://www.electronjs.org", github: "https://github.com/electron/electron", dependencies: "JavaScript, Node.js" },
    { url: "https://nwjs.io", github: "https://github.com/nwjs/nw.js", dependencies: "JavaScript, Node.js" },
    { url: "https://cordova.apache.org", github: "https://github.com/apache/cordova", dependencies: "JavaScript" },
    { url: "https://necolas.github.io/react-native-web/", github: "https://github.com/necolas/react-native-web", dependencies: "React Native, JavaScript" },
    { url: "https://ionicframework.com", github: "https://github.com/ionic-team/ionic-framework", dependencies: "Angular, React, Vue, JavaScript" },
    { url: "https://capacitorjs.com", github: "https://github.com/ionic-team/capacitor", dependencies: "JavaScript" },
    { url: "https://sciter.com", github: "https://github.com/c-smile/sciter-sdk", dependencies: "HTML, CSS, JavaScript" },
    { url: "https://neutralino.js.org", github: "https://github.com/neutralinojs/neutralinojs", dependencies: "JavaScript" },
    { url: "https://www.qt.io", github: "https://github.com/qt/qt5", dependencies: "C++" },
    { url: "https://dotnet.microsoft.com/apps/xamarin", github: "https://github.com/xamarin/xamarin-forms-samples", dependencies: "C#, .NET" },
    { url: "https://unity.com", github: "https://github.com/Unity-Technologies/UnityCsReference", dependencies: "C#" },
    { url: "https://kivy.org", github: "https://github.com/kivy/kivy", dependencies: "Python" },
    { url: "https://www.codenameone.com", github: "https://github.com/codenameone/CodenameOne", dependencies: "Java" },
    { url: "https://flex.apache.org", github: "https://github.com/apache/flex-sdk", dependencies: "ActionScript" },
    //{ url: "https://www.sencha.com/products/extjs/", github: "https://github.com/sencha", dependencies: "JavaScript" },
    { url: "https://cordova.apache.org", github: "https://github.com/apache/cordova", dependencies: "HTML, CSS, JavaScript" },
    { url: "https://flutter.dev", github: "https://github.com/flutter/flutter", dependencies: "Dart" },
    { url: "https://reactnative.dev", github: "https://github.com/facebook/react-native", dependencies: "JavaScript, React" },
    { url: "https://tauri.studio", github: "https://github.com/tauri-apps/tauri", dependencies: "Rust, Web Technologies" },
    { url: "https://www.webui.me/", github: "https://github.com/webui-dev/webui", dependencies: "Go, Web Technologies" },
    { url: "https://deskgap.com/", github: "https://github.com/patr0nus/DeskGap", dependencies: "JavaScript" },
    { url: "https://proton-native.js.org", github: "https://github.com/kusti8/proton-native", dependencies: "JavaScript, React" },
    // { url: "", github: "", dependencies: "" },
];

function calculateAgeInYears(creationDate) {
    const creation = new Date(creationDate);
    const current = new Date();
    return Math.floor((current - creation) / (1000 * 60 * 60 * 24 * 365));
}

function calculateAgeInDays(creationDate) {
    const creation = new Date(creationDate);
    const current = new Date();
    return Math.floor((current - creation) / (1000 * 60 * 60 * 24));
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to database.');
});

const createTableQuery = `CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY,
    url TEXT UNIQUE,
    dependencies TEXT,
    name TEXT,
    full_name TEXT,
    organization TEXT,
    homepage TEXT,
    html_url TEXT,
    description TEXT,
    created_at DATE,
    updated_at DATE,
    issues_count INTEGER,
    stargazers_count INTEGER,
    watchers_count INTEGER,
    language TEXT,
    license TEXT,
    last_commit_date DATE,
    forks_count INTEGER
)`;

db.run(createTableQuery, (err) => {
    if (err) {
        console.error(err.message);
    }
});

async function fetchAllRepoDataFromDB() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM repositories ORDER BY stargazers_count DESC, issues_count ASC, created_at DESC, last_commit_date DESC';
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function fetchRepoData(repoUrl) {
    const repoApiUrl = repoUrl.replace('https://github.com/', 'https://api.github.com/repos/');
    const commitsApiUrl = `${repoApiUrl}/commits`;

    try {
        const repoResponse = await axios.get(repoApiUrl, {
            headers: { 'Authorization': `token ${githubToken}` }
        });
        const repoData = repoResponse.data;

        const commitsResponse = await axios.get(commitsApiUrl, {
            headers: { 'Authorization': `token ${githubToken}` },
            params: { per_page: 1 } // Fetch only the latest commit
        });

        const latestCommit = commitsResponse.data[0];
        repoData.last_commit_date = latestCommit ? latestCommit.commit.committer.date : null;

        console.log(repoData)

        return repoData;
    } catch (error) {
        console.error('Error fetching repository data:', error);
    }
}

function insertRepoData(repoData) {
    const upsertQuery = `INSERT INTO repositories (
    name,
    url,
    dependencies,
    full_name,
    organization,
    html_url,
    homepage,
    description,
    created_at,
    updated_at,
    stargazers_count,
    watchers_count,
    issues_count,
    language,
    forks_count,
    license,
    last_commit_date
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(url) DO UPDATE SET
    name = excluded.name,
    url = excluded.url,
    dependencies = excluded.dependencies,
    full_name = excluded.full_name,
    organization = excluded.organization,
    description = excluded.description,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    stargazers_count = excluded.stargazers_count,
    watchers_count = excluded.watchers_count,
    issues_count = excluded.issues_count,
    language = excluded.language,
    forks_count = excluded.forks_count,
    license = excluded.license,
    last_commit_date = excluded.last_commit_date`;

    db.run(upsertQuery, [
        repoData.name,
        repoData.url,
        repoData.dependencies,
        repoData.full_name,
        repoData.organization,
        repoData.html_url,
        repoData.homepage,
        repoData.description,
        repoData.created_at,
        repoData.updated_at,
        repoData.stargazers_count,
        repoData.watchers_count,
        repoData.open_issues,
        repoData.language,
        repoData.forks_count,
        repoData.license ? repoData.license.spdx_id : null,
        repoData.last_commit_date
    ], (err) => {
        if (err) {
            console.error(err);
        }
    });
}

(async () => {
    for (let repo of repositories) {
        const repoData = await fetchRepoData(repo.github);
        repoData.url = repo.url;
        repoData.dependencies = repo.dependencies;
        insertRepoData(repoData);
    }
    const html = await generateTable();
    const markdown = await generateMarkdownTable();
    await fs.writeFile('index.html', html, 'utf8');
    await fs.writeFile('README.md', markdown, 'utf8');
})();

async function fetchRepoDataFromDB(repoUrl) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM repositories WHERE html_url = ?';
        db.get(query, [repoUrl], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function generateTable() {
    let html = '<table><tr><th>Name</th><th>Stars</th><th>Issues</th><th>Age (years)</th><th>Last Commit (days)</th><th>Dependencies</th><th>License</th></tr>';

    const repoDataList = await fetchAllRepoDataFromDB();

    for (const repoData of repoDataList) {
        if (repoData) {
            const ageInYears = calculateAgeInYears(repoData.created_at);
            const daysSinceLastCommit = calculateAgeInDays(repoData.last_commit_date);

            html += `<tr><td><a href="${repoData.html_url}">${repoData.full_name}</a></td><td>${repoData.stargazers_count}</td><td>${repoData.issues_count}</td><td>${ageInYears}</td><td>${daysSinceLastCommit}</td><td>${repoData.dependencies}</td><td>${repoData.license || 'Unknown'}</td></tr>`;
        }
    }

    html += '</table>';
    html += `<p>Last Updated At: ${new Date().toLocaleString()}</p>`;
    return html;
}

async function generateMarkdownTable() {
    let markdown = `# Awesome Datatables

![Contributions Welcome](https://img.shields.io/badge/Contributions-welcome-blue.svg)

`;
    markdown += '| Name | Stars | Issues | Age (Years) | Last Commit (days) | Dependencies | License |\n';
    markdown += '|------|--------------|--------|-------|--------|-------------|-------------|\n';

    const repoDataList = await fetchAllRepoDataFromDB();

    for (const repoData of repoDataList) {
        const ageInYears = calculateAgeInYears(repoData.created_at);
        const daysSinceLastCommit = calculateAgeInDays(repoData.last_commit_date);

        markdown += `| [${repoData.full_name}](https://github.com/${repoData.full_name}) | `;
        markdown += `![Stars](https://img.shields.io/github/stars/${repoData.full_name}?style=social) | `;
        markdown += `![Issues](https://img.shields.io/github/issues/${repoData.full_name}) | `;
        markdown += `${ageInYears} | ${daysSinceLastCommit} | ${repoData.dependencies} | ${repoData.license || '-'} |\n`;
    }

    //markdown += `\n_Last Updated At: ${new Date().toLocaleString()}_\n`;
    return markdown;
}

