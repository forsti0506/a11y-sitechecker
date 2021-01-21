import 'jasmine';
import * as child from 'child_process';

describe('a11y-sitechecker-bin', function () {
    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
    });

    it('add', async () => {
        const result = await cli(['-j', '--config=./tests/config.json', '-T=100', 'www.test.at'], '.');
        expect(result).toBe(0);
    });
});

function cli(args, cwd): Promise<number> {
    return new Promise((resolve) => {
        child
            .spawn('a11y-sitechecker', args, {
                shell: true,
                stdio: 'inherit',
            })
            .on('exit', (code) => {
                if (code === 0) {
                    resolve(0);
                } else {
                    resolve(code);
                }
            });
    });
}
