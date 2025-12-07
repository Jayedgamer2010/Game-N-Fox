{ pkgs }: {
    deps = [
      pkgs.unzip
      pkgs.nodejs-16_x
      pkgs.nodePackages.yarn
      pkgs.replitPackages.jest
      pkgs.nodePackages.typescript-language-server
    ];
}