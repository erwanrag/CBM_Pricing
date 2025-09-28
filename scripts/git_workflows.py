#!/usr/bin/env python3
"""
Scripts Git avancés pour CBM_Pricing
Automatise les workflows de développement avec conventions
"""

import subprocess
import sys
import os
from datetime import datetime
from typing import List, Optional

class GitWorkflow:
    """Gestionnaire des workflows Git avec conventions CBM"""
    
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.prefixes = {
            'backend': '[backend]',
            'frontend': '[frontend]', 
            'sql': '[sql]',
            'infra': '[infra]',
            'tests': '[tests]',
            'docs': '[docs]',
            'ci': '[ci]'
        }
    
    def run_command(self, cmd: List[str], cwd: Optional[str] = None) -> bool:
        """Exécute une commande et retourne le succès"""
        try:
            result = subprocess.run(
                cmd, 
                cwd=cwd or self.base_dir,
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✅ {' '.join(cmd)}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Erreur: {e}")
            print(f"Output: {e.stdout}")
            print(f"Error: {e.stderr}")
            return False
    
    def get_current_branch(self) -> str:
        """Récupère la branche actuelle"""
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=self.base_dir,
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    
    def create_feature_branch(self, feature_name: str, component: str) -> bool:
        """Crée une branche feature avec naming convention"""
        branch_name = f"feature/{component}-{feature_name}"
        
        print(f"🔄 Création de la branche: {branch_name}")
        
        # Récupérer les dernières modifications
        if not self.run_command(["git", "fetch", "origin"]):
            return False
        
        # Créer et basculer sur la nouvelle branche
        if not self.run_command(["git", "checkout", "-b", branch_name, "origin/develop"]):
            return False
        
        print(f"✅ Branche {branch_name} créée et active")
        return True
    
    def commit_with_convention(self, component: str, message: str, files: List[str] = None) -> bool:
        """Commit avec convention de nommage CBM"""
        prefix = self.prefixes.get(component, '[misc]')
        full_message = f"{prefix} {message}"
        
        # Ajouter les fichiers spécifiés ou tous les fichiers modifiés
        if files:
            for file in files:
                if not self.run_command(["git", "add", file]):
                    return False
        else:
            if not self.run_command(["git", "add", "."]):
                return False
        
        # Vérifier qu'il y a des modifications à commiter
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=self.base_dir
        )
        
        if result.returncode == 0:
            print("⚠️ Aucune modification à commiter")
            return True
        
        # Commiter
        if not self.run_command(["git", "commit", "-m", full_message]):
            return False
        
        print(f"✅ Commit créé: {full_message}")
        return True
    
    def push_and_create_pr(self, title: str, description: str = "") -> bool:
        """Push et prépare la création de PR"""
        current_branch = self.get_current_branch()
        
        # Push de la branche
        if not self.run_command(["git", "push", "-u", "origin", current_branch]):
            return False
        
        # Génération de l'URL pour créer la PR
        repo_url = self.get_repo_url()
        if repo_url:
            pr_url = f"{repo_url}/compare/develop...{current_branch}?quick_pull=1"
            pr_url += f"&title={title.replace(' ', '+')}"
            
            print(f"🔗 URL pour créer la PR:")
            print(f"   {pr_url}")
            print(f"📝 Titre suggéré: {title}")
            print(f"📄 Description: {description}")
        
        return True
    
    def get_repo_url(self) -> Optional[str]:
        """Récupère l'URL du repository GitHub"""
        try:
            result = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                cwd=self.base_dir,
                capture_output=True,
                text=True,
                check=True
            )
            url = result.stdout.strip()
            
            # Convertir SSH en HTTPS si nécessaire
            if url.startswith("git@github.com:"):
                url = url.replace("git@github.com:", "https://github.com/")
            if url.endswith(".git"):
                url = url[:-4]
            
            return url
        except:
            return None
    
    def run_pre_commit_checks(self) -> bool:
        """Lance les vérifications avant commit"""
        print("🔍 Vérifications pre-commit...")
        
        # Backend: Tests + Linting
        print("  🐍 Tests backend...")
        if not self.run_command(["python", "-m", "pytest", "tests/", "-v"], "backend"):
            return False
        
        print("  🧼 Black formatting...")
        if not self.run_command(["black", "--check", "app/"], "backend"):
            print("⚠️ Formatage nécessaire, application automatique...")
            self.run_command(["black", "app/"], "backend")
        
        print("  🔍 Flake8 linting...")
        if not self.run_command(["flake8", "app/", "--max-line-length=100"], "backend"):
            return False
        
        # Frontend: Build + Lint
        print("  🟢 Tests frontend...")
        if not self.run_command(["npm", "run", "test", "--", "--watchAll=false"], "frontend"):
            return False
        
        print("  🔍 ESLint...")
        if not self.run_command(["npm", "run", "lint"], "frontend"):
            return False
        
        print("✅ Toutes les vérifications passent")
        return True
    
    def hotfix_workflow(self, hotfix_name: str, component: str) -> bool:
        """Workflow pour hotfix en production"""
        branch_name = f"hotfix/{component}-{hotfix_name}"
        
        print(f"🚨 Création hotfix: {branch_name}")
        
        # Partir de main
        if not self.run_command(["git", "checkout", "main"]):
            return False
        
        if not self.run_command(["git", "pull", "origin", "main"]):
            return False
        
        if not self.run_command(["git", "checkout", "-b", branch_name]):
            return False
        
        print(f"✅ Branche hotfix {branch_name} prête")
        return True

def main():
    """Interface CLI pour les workflows Git"""
    workflow = GitWorkflow()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python git_workflows.py feature <component> <name>")
        print("  python git_workflows.py commit <component> <message>")
        print("  python git_workflows.py push <title> [description]")
        print("  python git_workflows.py hotfix <component> <name>")
        print("  python git_workflows.py check")
        print("")
        print("Components: backend, frontend, sql, infra, tests, docs, ci")
        return
    
    command = sys.argv[1]
    
    if command == "feature":
        if len(sys.argv) < 4:
            print("Usage: python git_workflows.py feature <component> <name>")
            return
        component = sys.argv[2]
        name = sys.argv[3]
        workflow.create_feature_branch(name, component)
    
    elif command == "commit":
        if len(sys.argv) < 4:
            print("Usage: python git_workflows.py commit <component> <message>")
            return
        component = sys.argv[2]
        message = " ".join(sys.argv[3:])
        workflow.commit_with_convention(component, message)
    
    elif command == "push":
        if len(sys.argv) < 3:
            print("Usage: python git_workflows.py push <title> [description]")
            return
        title = sys.argv[2]
        description = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
        workflow.push_and_create_pr(title, description)
    
    elif command == "hotfix":
        if len(sys.argv) < 4:
            print("Usage: python git_workflows.py hotfix <component> <name>")
            return
        component = sys.argv[2]
        name = sys.argv[3]
        workflow.hotfix_workflow(name, component)
    
    elif command == "check":
        workflow.run_pre_commit_checks()
    
    else:
        print(f"Commande inconnue: {command}")

if __name__ == "__main__":
    main()