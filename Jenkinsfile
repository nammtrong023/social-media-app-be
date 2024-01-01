pipeline {
    agent any

    parameters {
        choice(name: 'ACTION', choices: ['Build', 'Remove all'], description: 'Pick something')
    }

    stages {
        stage('Building/Deploying') {
            when {
                expression { params.ACTION == 'Build' }
            }
            steps {
                withCredentials([file(credentialsId: 'secret-file', variable: 'SECRET_FILE')]) {
                    script {
                        writeFile file: '.env', text: sh(script: "cat $SECRET_FILE", returnStdout: true).trim()
                    }

                    sh 'cat .env'

                    withDockerRegistry(credentialsId: 'dockerhub', url: 'https://index.docker.io/v1/') {
                        sh 'docker compose up -d --build'
                        sh 'docker compose push'
                    }
                }
            }
        }

        stage('Removing all') {
            when {
                expression { params.ACTION == 'Remove all' }
            }
            steps {
                sh 'docker compose down -v '
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
