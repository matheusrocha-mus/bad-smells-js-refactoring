const REPORT_TYPES = Object.freeze({
  CSV: 'CSV',
  HTML: 'HTML',
});

const USER_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  USER: 'USER',
});

const PRIORITY_THRESHOLD = 1000;
const STANDARD_USER_MAX_VALUE = 500;

class CsvReportFormatter {
  constructor(user) {
    this.user = user;
  }

  header() {
    return 'ID,NOME,VALOR,USUARIO\n';
  }

  line(item) {
    return `${item.id},${item.name},${item.value},${this.user.name}\n`;
  }

  footer(total) {
    return `\nTotal,,\n${total},,\n`;
  }
}

class HtmlReportFormatter {
  constructor(user) {
    this.user = user;
  }

  header() {
    return (
      '<html><body>\n'
      + '<h1>Relatório</h1>\n'
      + `<h2>Usuário: ${this.user.name}</h2>\n`
      + '<table>\n'
      + '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n'
    );
  }

  line(item) {
    const styleAttribute = item.priority ? ' style="font-weight:bold;"' : '';
    return `<tr${styleAttribute}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  }

  footer(total) {
    return `</table>\n<h3>Total: ${total}</h3>\n</body></html>\n`;
  }
}

class NullReportFormatter {
  header() {
    return '';
  }

  line() {
    return '';
  }

  footer() {
    return '';
  }
}

class AdminItemPolicy {
  shouldInclude() {
    return true;
  }

  decorate(item) {
    return {
      ...item,
      priority: item.value > PRIORITY_THRESHOLD,
    };
  }
}

class StandardUserItemPolicy {
  shouldInclude(item) {
    return item.value <= STANDARD_USER_MAX_VALUE;
  }

  decorate(item) {
    return { ...item };
  }
}

class NoAccessItemPolicy {
  shouldInclude() {
    return false;
  }

  decorate(item) {
    return { ...item };
  }
}

function createFormatter(reportType, user) {
  const formatters = {
    [REPORT_TYPES.CSV]: new CsvReportFormatter(user),
    [REPORT_TYPES.HTML]: new HtmlReportFormatter(user),
  };

  return formatters[reportType] ?? new NullReportFormatter();
}

function createItemPolicy(userRole) {
  const policies = {
    [USER_ROLES.ADMIN]: new AdminItemPolicy(),
    [USER_ROLES.USER]: new StandardUserItemPolicy(),
  };

  return policies[userRole] ?? new NoAccessItemPolicy();
}

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  generateReport(reportType, user, items) {
    const formatter = createFormatter(reportType, user);
    const itemPolicy = createItemPolicy(user.role);

    return this.buildReport(formatter, itemPolicy, items);
  }

  buildReport(formatter, itemPolicy, items) {
    const parts = [formatter.header()];
    let total = 0;

    for (const item of items) {
      if (!itemPolicy.shouldInclude(item)) {
        continue;
      }

      const decoratedItem = itemPolicy.decorate(item);
      parts.push(formatter.line(decoratedItem));
      total += decoratedItem.value;
    }

    parts.push(formatter.footer(total));
    return parts.join('').trim();
  }
}