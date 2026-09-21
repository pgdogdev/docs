module.exports = async ({ core }) => {
  const { fixes } = JSON.parse(process.env.CODEX_RESULT);
  if (!Array.isArray(fixes) || fixes.some(fix => typeof fix !== 'string' || !fix.trim())) {
    throw new Error('Invalid spelling and grammar result from Codex.');
  }
  if (fixes.length === 0) {
    await core.summary.addRaw('No spelling or grammar errors found in the PR diff.').write();
  } else {
    for (const fix of fixes) core.error(fix);
    await core.summary
      .addHeading('Suggested spelling and grammar fixes')
      .addRaw(fixes.map(fix => `- ${fix}`).join('\n'))
      .write();
    core.setFailed(`Found ${fixes.length} spelling or grammar error(s). See suggested fixes above.`);
  }
};
