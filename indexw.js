const express = require('express');
const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const Figlet = require('figlet');

const app = express();
const port = 8000;

// Utiliser EJS comme moteur de template
app.set('view engine', 'ejs');

// Middleware pour parser les données du formulaire
app.use(express.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.post('/search', async (req, res) => {
  const userUrl = req.body.userUrl;
  const allBranches = req.body.allBranches === 'true';
  const saveToFile = req.body.saveToFile === 'true';

  const glit = new Glit();
  await glit.extractUserEmails(userUrl, allBranches, saveToFile);

  res.render('results', { results: glit.results });
});

class GlitExporter {
  constructor(outputPath) {
    this.outputPath = outputPath;
  }

  exportUser(data) {
    fs.writeFileSync(this.outputPath, JSON.stringify(data));
  }
}

class GlitPrinter {
  printUser(data) {
    console.table(data, ['repository', 'emails']);
  }

  printMessage(message) {
    console.log(message);
  }
}

class Glit {
  constructor() {
    this.console = console;
    this.results = [];
  }

  async extractUserEmails(userUrl, allBranches, saveToFile) {
    try {
      const repositoriesUrl = `${userUrl}/repos`;
      const response = await axios.get(repositoriesUrl);

      if (response.status === 200) {
        const repositories = response.data;

        for (const repo of repositories) {
          const repoName = repo.name;
          const repoUrl = repo.html_url;
          const emails = await this.extractEmailsFromRepository(repoUrl);
          this.results.push({ repository: repoName, emails });
        }

        if (saveToFile) {
          const outputPath = await this.selectOutputFile();
          const exporter = new GlitExporter(outputPath);
          exporter.exportUser(this.results);
        }
      }
    } catch (error) {
      console.error(`Error extracting emails from repository: ${error}`);
    }
  }

  async extractEmailsFromRepository(repoUrl) {
    try {
      const response = await axios.get(repoUrl);

      if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = [];

        $('body').text().replace(emailPattern, (match) => {
          emails.push(match);
        });

        return emails;
      } else {
        console.error(`Error extracting emails from repository: ${response.status}`);
        return [];
      }
    } catch (error) {
      console.error(`Error extracting emails from repository: ${error}`);
      return [];
    }
  }

  async selectOutputFile() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('Enter the output file path: ', (answer) => {
        resolve(answer);
        rl.close();
      });
    });
  }
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
