-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: orbital_risk_tracker
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `orbitalzone`
--

DROP TABLE IF EXISTS `orbitalzone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orbitalzone` (
  `zone_num` int NOT NULL AUTO_INCREMENT,
  `zone_name` varchar(50) NOT NULL,
  `altitude_band` enum('LEO','MEO','GEO') NOT NULL,
  `altitude_min` int NOT NULL,
  `altitude_max` int NOT NULL,
  `sector` int NOT NULL,
  `zone_capacity` int DEFAULT '10',
  `congestion_level` enum('low','medium','high') DEFAULT 'low',
  `is_high_traffic` tinyint(1) DEFAULT '0',
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`zone_num`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orbitpass`
--

DROP TABLE IF EXISTS `orbitpass`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orbitpass` (
  `pass_id` int NOT NULL AUTO_INCREMENT,
  `pass_num` int NOT NULL,
  `object_type` enum('satellite','debris') NOT NULL,
  `object_id` int NOT NULL,
  `zone_id` int NOT NULL,
  PRIMARY KEY (`pass_id`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `orbitpass_ibfk_1` FOREIGN KEY (`zone_id`) REFERENCES `orbitalzone` (`zone_num`)
) ENGINE=InnoDB AUTO_INCREMENT=421 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proximityalert`
--

DROP TABLE IF EXISTS `proximityalert`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proximityalert` (
  `alert_id` int NOT NULL AUTO_INCREMENT,
  `zone_id` int NOT NULL,
  `debris_id` int NOT NULL,
  `satellite_id` int NOT NULL,
  `alert_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `debris_size_at_alert` decimal(6,2) DEFAULT NULL,
  `status` enum('active','resolved','expired') DEFAULT 'active',
  PRIMARY KEY (`alert_id`),
  KEY `zone_id` (`zone_id`),
  KEY `debris_id` (`debris_id`),
  KEY `satellite_id` (`satellite_id`),
  CONSTRAINT `proximityalert_ibfk_1` FOREIGN KEY (`zone_id`) REFERENCES `orbitalzone` (`zone_num`),
  CONSTRAINT `proximityalert_ibfk_2` FOREIGN KEY (`debris_id`) REFERENCES `spacedebris` (`devris_id`),
  CONSTRAINT `proximityalert_ibfk_3` FOREIGN KEY (`satellite_id`) REFERENCES `satellite` (`satellite_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `satellite`
--

DROP TABLE IF EXISTS `satellite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `satellite` (
  `satellite_id` int NOT NULL AUTO_INCREMENT,
  `zone_id` int NOT NULL,
  `satellite_name` varchar(150) NOT NULL,
  `org_owner` varchar(150) DEFAULT NULL,
  `registry_user` varchar(150) DEFAULT NULL,
  `purpose` varchar(150) DEFAULT NULL,
  `class_of_orbit` varchar(50) DEFAULT NULL,
  `type_of_orbit` varchar(50) DEFAULT NULL,
  `longitude` decimal(8,4) DEFAULT NULL,
  `eccentricity` decimal(6,5) DEFAULT NULL,
  `perigree` decimal(8,2) DEFAULT NULL,
  `launch_mass` decimal(10,2) DEFAULT NULL,
  `expected_lifetime` decimal(5,2) DEFAULT NULL,
  `NORAD_nmber` int DEFAULT NULL,
  PRIMARY KEY (`satellite_id`),
  UNIQUE KEY `NORAD_nmber` (`NORAD_nmber`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `satellite_ibfk_1` FOREIGN KEY (`zone_id`) REFERENCES `orbitalzone` (`zone_num`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `spacedebris`
--

DROP TABLE IF EXISTS `spacedebris`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `spacedebris` (
  `devris_id` int NOT NULL AUTO_INCREMENT,
  `zone_id` int NOT NULL,
  `debris_name` varchar(100) NOT NULL,
  `mass` decimal(10,2) DEFAULT NULL,
  `size_category` enum('small','medium','large') NOT NULL,
  `size_cm` decimal(6,2) NOT NULL,
  `velocity_kmps` decimal(6,2) DEFAULT NULL,
  `origin_type` enum('rocket_fragment','defunct_satellite','collision_fragment','unknown') DEFAULT 'unknown',
  `detected_date` date DEFAULT NULL,
  `status` enum('active','decayed','removed') DEFAULT 'active',
  `last_updated` date DEFAULT NULL,
  PRIMARY KEY (`devris_id`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `spacedebris_ibfk_1` FOREIGN KEY (`zone_id`) REFERENCES `orbitalzone` (`zone_num`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'orbital_risk_tracker'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-11 22:39:01
