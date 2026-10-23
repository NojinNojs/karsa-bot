{
  description = "KARSA — Discord RPG bot (bun dev shell)";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          nodejs_22
          sqlite
          typescript-language-server
        ];

        shellHook = ''
          echo "KARSA — bun $(bun --version)"
        '';
      };

      formatter.${system} = pkgs.nixfmt;
    };
}
