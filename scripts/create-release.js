const {execSync} = require('child_process');
const {version} = require('../package.json');

try {
    // Checkout the main branch
    execSync('git checkout main', {stdio: 'inherit'});

    // Pull the latest changes
    execSync('git pull origin main', {stdio: 'inherit'});

    // Run yarn version patch with a message
    execSync(`yarn version --patch --message "release: bump version to %s"`, {stdio: 'inherit'});

    // Get the new version from package.json
    const newVersion = require('../package.json').version;

    // Create a new branch named release-VERSION
    const branchName = `release-${newVersion}`;
    execSync(`git checkout -b ${branchName}`, {stdio: 'inherit'});

    // Push the new branch to git
    execSync(`git push origin ${branchName}`, {stdio: 'inherit'});

    // Create a pull request and open it in the browser
    execSync(`gh pr create --fill --base main --head ${branchName} --web`, {stdio: 'inherit'});

    console.log(`Release branch ${branchName} created, pushed, and pull request opened successfully.`);
} catch (error) {
    console.error('Error creating release branch:', error.message);
    process.exit(1);
}
