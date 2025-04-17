interface MetaData {
  version: string;
  platforms: {
    [platform: string]: {
      signature: string;
      url: string;
    };
  };
}

const PLATFORMS = {
  windows_64: {
    name: "windows-x86_64",
    dir: "msi",
  },
};

function createMetaData(bundlePath: string, version: string): MetaData {
  const metaData: MetaData = {
    version,
    platforms: {},
  };

  for (const path of Deno.readDirSync(bundlePath)) {
    if (
      Object.values(PLATFORMS).some((platform) => platform.dir === path.name)
    ) {
      // find the install and the signature files
      const installFiles = [...Deno.readDirSync(`${bundlePath}/${path.name}`)];

      const sigFile = installFiles.find((file) => file.name.endsWith(".sig"));

      const installFile = installFiles.find(
        (file) => file.name !== sigFile?.name
      );

      if (!installFile || !sigFile) {
        throw new Error("Install file or signature file not found");
      }

      // extact the signature
      const sig = Deno.readTextFileSync(
        `${bundlePath}/${path.name}/${sigFile?.name}`
      );

      // get the url of the file to use
      const url = `https://github.com/jaym-01/snipr-release/releases/latest/download/${installFile.name}`;

      const target = Object.values(PLATFORMS).find(
        (platform) => path.name === platform.dir
      );

      if (!target) {
        throw new Error(
          "Unreachable - if statement condition would not have passed"
        );
      }

      // add it to the meta data
      metaData.platforms[target.name] = {
        signature: sig,
        url,
      };
    }
  }

  return metaData;
}

function writeMetaData(bundlePath: string, data: MetaData) {
  Deno.writeTextFileSync(
    `${bundlePath}/latest.json`,
    JSON.stringify(data, null, 2)
  );
}

function parseArgs() {
  const args: { [key: string]: string | undefined } = {
    "bundle-path": undefined,
    version: undefined,
  };

  Object.keys(args).forEach((arg) => {
    const argIndex = Deno.args.indexOf(`--${arg}`);
    if (argIndex !== -1 && argIndex + 1 < Deno.args.length) {
      args[arg as keyof typeof argIndex] = Deno.args[argIndex + 1];
    } else {
      throw new Error(`Missing argument: --${arg}`);
    }
  });

  if (Object.values(args).some((arg) => arg === undefined)) {
    throw new Error(
      "Missing arguments: --bundle-path and --version are required"
    );
  }

  return args as { [key: string]: string };
}

const args = parseArgs();
writeMetaData(
  args["bundle-path"],
  createMetaData(args["bundle-path"], args.version)
);
