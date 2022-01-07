function toMatchMarkdown(received, expectedValue) {
  const trimmedReceived = received.replace(/\s/g, '');
  const trimmedValue = expectedValue.replace(/\s/g, '');

  const pass = trimmedReceived === trimmedValue;
  if (pass) {
    return {
      message: 'Pass',
      pass: true,
    };
  }
  return {
    message: () => `
      Markdown values did not match
      
      Expected:
      ${expectedValue}

      Received:
      ${received}
      
      `,
    pass: false,
  };
}

expect.extend({
  // @ts-ignore
  toMatchMarkdown,
});
