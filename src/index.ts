import { createUnleashAction } from './unleash-action';
import { getInput, getMultilineInput, setOutput } from '@actions/core';

const appName = getInput('app-name');
const url = getInput('url');
const clientKey = getInput('api-key');

const context: Record<string, string> = {};
const contextLines = getMultilineInput('context');
for (const line of contextLines) {
  const kvp = line.split('=');
  context[kvp[0]] = kvp[1];
}

const features = getMultilineInput('is-enabled');
const variants = getMultilineInput('get-variant');

createUnleashAction({
  url: url,
  clientKey: clientKey,
  appName: appName,
  context: context,
  features: features,
  variants: variants,
  setResult: setOutput,
}).then(() => {
  console.log('Done!');
});
