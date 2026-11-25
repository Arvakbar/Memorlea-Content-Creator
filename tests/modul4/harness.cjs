const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const coverageEnabled = process.env.PKPL_MODUL4_COVERAGE === '1';
const scripts = new Map();
const coverage = coverageEnabled ? require('istanbul-lib-coverage').createCoverageMap() : null;

function source(file) {
  if (!scripts.has(file)) {
    const filename = path.join(root, file);
    const original = fs.readFileSync(filename, 'utf8');
    const code = coverageEnabled
      ? require('istanbul-lib-instrument').createInstrumenter().instrumentSync(original, filename)
      : original;
    scripts.set(file, new vm.Script(code, { filename }));
  }
  return scripts.get(file);
}

function element(properties = {}) {
  return {
    value: '',
    textContent: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    ...properties,
  };
}

function harness(t, files = ['js/admin.js'], globals = {}) {
  const elements = new Map();
  const context = vm.createContext({
    console,
    document: {
      addEventListener() {},
      getElementById: id => elements.get(id) ?? null,
    },
    setTimeout() {},
    ...globals,
  });
  for (const file of files) source(file).runInContext(context);
  t.after(() => {
    if (coverage) coverage.merge(context.__coverage__);
  });

  return {
    context,
    add(id, properties) {
      const node = element(properties);
      elements.set(id, node);
      return node;
    },
    seed(state) {
      context.fixtureState = state;
      for (const name of Object.keys(state)) {
        vm.runInContext(`${name} = fixtureState.${name}`, context);
      }
      delete context.fixtureState;
    },
    read(expression) {
      return vm.runInContext(expression, context);
    },
    spy(name, implementation = () => {}) {
      return t.mock.method(context, name, implementation);
    },
  };
}

// A stub for Supabase's fluent builder. Each expected chain supplies a canned response.
// The call log is a spy and lets tests check table, filters and payload independently.
function supabaseStub(t, ...responses) {
  const spy = t.mock.fn();
  let current = 0;
  t.after(() => {
    assert.equal(current, responses.length, 'all stub responses were used');
    assert.equal(spy.mock.callCount(), responses.length, 'no unexpected query reached the stub');
  });
  return {
    spy,
    db: {
      from(table) {
        const request = [['from', table]];
        const query = {
          then(resolve, reject) {
            spy(...request);
            return Promise.resolve().then(() => {
              assert.ok(current < responses.length, 'unexpected Supabase query');
              const response = responses[current++];
              return typeof response === 'function' ? response() : response;
            }).then(resolve, reject);
          },
        };
        for (const method of ['select', 'eq', 'order', 'limit', 'single', 'insert', 'update']) {
          query[method] = (...args) => {
            request.push([method, ...args]);
            return query;
          };
        }
        return query;
      },
    },
  };
}

function calls(spy) {
  return JSON.parse(JSON.stringify(spy.mock.calls.map(call => call.arguments)));
}

module.exports = { calls, coverage, harness, root, supabaseStub };
