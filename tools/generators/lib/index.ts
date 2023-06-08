import {
  Tree,
  formatFiles,
  installPackagesTask,
  joinPathFragments,
  readProjectConfiguration,
  updateProjectConfiguration,
} from "@nrwl/devkit";
import { libraryGenerator } from "@nrwl/js";

interface CustomLibSchema {
  name: string;
}

export default async function (tree: Tree, options: CustomLibSchema) {
  const { name } = options;
  const importPath = `@antoinelncl/${name}`;

  await libraryGenerator(tree, {
    name,
    publishable: true,
    importPath,
  });

  const projectConfig = readProjectConfiguration(tree, name);
  const projectJsonPath = joinPathFragments(projectConfig.root, "project.json");

  const projectJson = {
    ...projectConfig,
    targets: {
      build: {
        executor: "@nrwl/js:tsc",
        outputs: ["{options.outputPath}"],
        options: {
          outputPath: `dist/packages/${name}`,
          main: `packages/${name}/src/index.ts`,
          tsConfig: `packages/${name}/tsconfig.lib.json`,
          assets: [`packages/${name}/*.md`],
        },
      },
      lint: {
        executor: "@nrwl/linter:eslint",
        outputs: ["{options.outputFile}"],
        options: {
          lintFilePatterns: [`packages/${name}/**/*.ts`],
        },
      },
      test: {
        executor: "@nrwl/jest:jest",
        outputs: ["{workspaceRoot}/coverage/{projectRoot}"],
        options: {
          jestConfig: `packages/${name}/jest.config.ts`,
          passWithNoTests: true,
        },
        configurations: {
          ci: {
            ci: true,
            codeCoverage: true,
          },
        },
      },
      version: {
        executor: "@jscutlery/semver:version",
        options: {
          baseBranch: "master",
          push: true,
          noVerify: false,
          postTargets: [`${name}:npm`, `${name}:github`],
        },
      },
      alphaVersion: {
        executor: "@jscutlery/semver:version",
        options: {
          noVerify: false,
          releaseAs: "prerelease",
          preid: "alpha",
          postTargets: [`${name}:npm`, `${name}:github`],
        },
      },
      github: {
        executor: "@jscutlery/semver:github",
        options: {
          tag: "${tag}",
          notes: "${notes}",
        },
      },
      npm: {
        executor: "ngx-deploy-npm:deploy",
        options: {
          access: "public",
        },
      },
    },
  };

  updateProjectConfiguration(tree, name, projectJson);

  if (!tree.exists(projectJsonPath)) {
    throw new Error(
      `Le fichier project.json n'a pas été trouvé pour la librairie "${name}".`
    );
  }

  tree.write(projectJsonPath, JSON.stringify(projectJson, null, 2));

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}
