const readline = require('readline');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const Figlet = require('figlet');

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

  async run() {
    this.printBanner();
    await this.interactiveUserEmails();
  }

  printBanner() {
    const banner = Figlet.textSync('OSINT git by TRHACKNON', 'Standard');
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', banner);
  }

  async interactiveUserEmails() {
    const userUrl = await this.selectUser();
    const allBranches = await this.selectAllBranches();
    const saveToFile = await this.selectSaveToFile();

    await this.extractUserEmails(userUrl, allBranches, saveToFile);

    this.printResults();
  }

  async selectUser() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('Enter the GitHub URL of the user: ', (answer) => {
        resolve(answer);
        rl.close();
      });
    });
  }

  async selectAllBranches() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('Do you want to get all branches of the repositories? (yes/no): ', (answer) => {
        resolve(answer === 'yes');
        rl.close();
      });
    });
  }

  async selectSaveToFile() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('Do you want to save the results to a JSON file? (yes/no): ', (answer) => {
        resolve(answer === 'yes');
        rl.close();
      });
    });
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

  printResults() {
    const printer = new GlitPrinter();
    printer.printUser(this.results);
  }
}

const glit = new Glit();
glit.run();
