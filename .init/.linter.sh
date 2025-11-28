#!/bin/bash
cd /home/kavia/workspace/code-generation/currency-calculator-hub-214584-214593/frontend_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

