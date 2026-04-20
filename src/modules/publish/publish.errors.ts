/** Maps npm output into a user-friendly publish failure message. */
export function getPublishFailureMessage(output: string): string {
  const normalizedOutput = output.toLowerCase();
  const details = output.trim().split('\n').slice(0, 3).join('\n');

  if (
    normalizedOutput.includes('eneedauth') ||
    normalizedOutput.includes('e401') ||
    normalizedOutput.includes('403') ||
    normalizedOutput.includes('auth')
  ) {
    return `NPM auth/permission error. Check token and package access.\n${details}`;
  }

  if (normalizedOutput.includes('registry')) {
    return `NPM registry error. Verify npmjs.org target.\n${details}`;
  }

  return `NPM publish failed.\n${details}`;
}
