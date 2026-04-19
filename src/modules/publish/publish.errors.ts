/** Maps npm output into a user-friendly publish failure message. */
export function getPublishFailureMessage(output: string): string {
  const normalizedOutput = output.toLowerCase();

  if (
    normalizedOutput.includes('eneedauth') ||
    normalizedOutput.includes('e401') ||
    normalizedOutput.includes('403') ||
    normalizedOutput.includes('auth')
  ) {
    return `NPM publish failed due to authentication or permission issues. Verify the token and package access settings.\n${output}`;
  }

  if (normalizedOutput.includes('registry')) {
    return `NPM publish failed due to registry configuration. Verify the package is being published to npmjs.org.\n${output}`;
  }

  return `NPM publish failed.\n${output}`;
}
