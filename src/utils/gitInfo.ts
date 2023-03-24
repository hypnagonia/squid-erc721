const {execSync} = require('child_process')

let hash: String

export const getGitCommitHash = () => {
    try {
        const output = execSync(`git log -1`)
        hash = output.toString().split('\n')[0]
        return hash
    } catch (err) {
        return 'Unset'
    }
}
