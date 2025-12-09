import boto3
import os
import mimetypes
from botocore.exceptions import NoCredentialsError

class S3Service:
    def __init__(self):
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('AWS_BUCKET_NAME')
        self.region = os.getenv('AWS_REGION', 'ap-northeast-2')
        
        # Only initialize if credentials are present
        if self.access_key and self.secret_key and self.bucket_name:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
            self.enabled = True
        else:
            self.enabled = False
            print("AWS S3 credentials missing. S3 service disabled.")

    def upload_file(self, file_path, object_name=None):
        """Upload a file to an S3 bucket and return the public URL"""
        if not self.enabled:
            raise Exception("AWS S3 service is not configured")

        if object_name is None:
            object_name = os.path.basename(file_path)

        # Guess content type
        content_type, _ = mimetypes.guess_type(file_path)
        if content_type is None:
            content_type = 'application/octet-stream'

        try:
            # Upload the file
            self.s3.upload_file(
                file_path, 
                self.bucket_name, 
                object_name,
                ExtraArgs={'ContentType': content_type}
            )
            
            # Generate public URL
            url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{object_name}"
            return url
        except FileNotFoundError:
            print("The file was not found")
            raise
        except NoCredentialsError:
            print("Credentials not available")
            raise
        except Exception as e:
            print(f"Error uploading to S3: {e}")
            raise

s3_service = S3Service()

