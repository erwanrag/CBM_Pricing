@echo off
REM scripts/git_workflows.bat - Workflows Git pour CBM_Pricing sur Windows

setlocal enabledelayedexpansion

if "%1"=="" goto :usage

if "%1"=="feature" goto :feature
if "%1"=="commit" goto :commit  
if "%1"=="push" goto :push
if "%1"=="hotfix" goto :hotfix
if "%1"=="check" goto :check
goto :usage

:feature
if "%2"=="" goto :usage_feature
if "%3"=="" goto :usage_feature
set component=%2
set name=%3
set branch_name=feature/%component%-%name%

echo 🔄 Création de la branche: %branch_name%
git fetch origin
git checkout develop
git pull origin develop
git checkout -b %branch_name%
echo ✅ Branche %branch_name% créée et active
goto :end

:commit
if "%2"=="" goto :usage_commit
if "%3"=="" goto :usage_commit
set component=%2
set message=%3 %4 %5 %6 %7 %8 %9

REM Mapping des préfixes
if "%component%"=="backend" set prefix=[backend]
if "%component%"=="frontend" set prefix=[frontend]
if "%component%"=="sql" set prefix=[sql]
if "%component%"=="infra" set prefix=[infra]
if "%component%"=="tests" set prefix=[tests]
if "%component%"=="docs" set prefix=[docs]
if "%component%"=="ci" set prefix=[ci]
if "%prefix%"=="" set prefix=[misc]

set full_message=%prefix% %message%

echo 📝 Commit: %full_message%
git add .
git diff --cached --quiet
if %errorlevel%==0 (
    echo ⚠️ Aucune modification à commiter
    goto :end
)

git commit -m "%full_message%"
echo ✅ Commit créé: %full_message%
goto :end

:push
if "%2"=="" goto :usage_push
set title=%2 %3 %4 %5 %6 %7 %8 %9

REM Récupérer la branche actuelle
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i

echo 🚀 Push de la branche: %current_branch%
git push -u origin %current_branch%

REM Récupérer l'URL du repo
for /f "tokens=*" %%i in ('git config --get remote.origin.url') do set repo_url=%%i
set repo_url=%repo_url:.git=%
set repo_url=%repo_url:git@github.com:=https://github.com/%

echo.
echo 🔗 URL pour créer la PR:
echo %repo_url%/compare/develop...%current_branch%?quick_pull=1
echo 📝 Titre suggéré: %title%
goto :end

:hotfix
if "%2"=="" goto :usage_hotfix
if "%3"=="" goto :usage_hotfix
set component=%2
set name=%3
set branch_name=hotfix/%component%-%name%

echo 🚨 Création hotfix: %branch_name%
git checkout main
git pull origin main
git checkout -b %branch_name%
echo ✅ Branche hotfix %branch_name% prête
goto :end

:check
echo 🔍 Vérifications pre-commit...

echo   🐍 Tests backend...
cd backend
python -m pytest tests/ -v
if %errorlevel% neq 0 (
    echo ❌ Tests backend échoués
    cd ..
    goto :end
)

echo   🧼 Black formatting...
black --check app/
if %errorlevel% neq 0 (
    echo ⚠️ Formatage nécessaire, application automatique...
    black app/
)

echo   🔍 Flake8 linting...
flake8 app/ --max-line-length=100
if %errorlevel% neq 0 (
    echo ❌ Erreurs de linting détectées
    cd ..
    goto :end
)

cd ..

echo   🟢 Tests frontend...
cd frontend
call npm run test -- --watchAll=false
if %errorlevel% neq 0 (
    echo ❌ Tests frontend échoués
    cd ..
    goto :end
)

echo   🔍 ESLint...
call npm run lint
if %errorlevel% neq 0 (
    echo ❌ Erreurs ESLint détectées
    cd ..
    goto :end
)

cd ..
echo ✅ Toutes les vérifications passent
goto :end

:usage
echo Usage:
echo   git_workflows.bat feature ^<component^> ^<name^>
echo   git_workflows.bat commit ^<component^> ^<message^>
echo   git_workflows.bat push ^<title^>
echo   git_workflows.bat hotfix ^<component^> ^<name^>
echo   git_workflows.bat check
echo.
echo Components: backend, frontend, sql, infra, tests, docs, ci
echo.
echo Exemples:
echo   git_workflows.bat feature backend monitoring-avance
echo   git_workflows.bat commit backend "ajout service monitoring"
echo   git_workflows.bat push "Monitoring avancé + IA"
echo   git_workflows.bat check
goto :end

:usage_feature
echo Usage: git_workflows.bat feature ^<component^> ^<name^>
echo Exemple: git_workflows.bat feature backend monitoring-avance
goto :end

:usage_commit
echo Usage: git_workflows.bat commit ^<component^> ^<message^>
echo Exemple: git_workflows.bat commit backend "ajout service monitoring"
goto :end

:usage_push
echo Usage: git_workflows.bat push ^<title^>
echo Exemple: git_workflows.bat push "Monitoring avancé + IA"
goto :end

:usage_hotfix
echo Usage: git_workflows.bat hotfix ^<component^> ^<name^>
echo Exemple: git_workflows.bat hotfix backend fix-critique
goto :end

:end
endlocal